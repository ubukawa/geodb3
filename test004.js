// test004
const config = require('config')
const fs = require('fs')
const Parser = require('json-text-sequence').parser
const { spawn } = require('child_process')
const tilebelt = require('@mapbox/tilebelt')
const TimeFormat = require('hh-mm-ss')
const Queue = require('better-queue')
const pretty = require('prettysize')
const Spinner = require('cli-spinner').Spinner

const minzoom = config.get('minzoom')
const maxzoom = config.get('maxzoom')
const srcdb = config.get('srcdb')
const ogr2ogrPath = config.get('ogr2ogrPath')
const tippecanoePath = config.get('tippecanoePath')
const mbtilesDir = config.get('mbtilesDir')
const spinnerString = config.get('spinnerString')

//concurrent: 3
//maxRetries: 3
//retryDelay: 500

Spinner.setDefaultSpinnerString(spinnerString)
let idle = true
let wtps
let modules = {}
let moduleKeysInProgress = []
let productionSpinner = new Spinner()

const isIdle = () => {
    return idle
}

const iso = () => {
    return (new Date()).toISOString()
}

const noPressureWrite = (downstream, f) => {
    return new Promise((res) => {
        if (downstream.write(`\x1e${JSON.stringify(f)}\n`)){
            res()
        } else {
            downstream.once('drain', () => {
                res()
            })
        }
    })
}

const fetch = (ogr2ogr, moduleKey, downstream) => {
    return new Promise((resolve, reject) => {
        let count = 0
        let features = []        
        
            
    })
}

const dumpAndModify = async (bbox, downstream, moduleKey) => {
    return new Promise((resolve, reject) => {
        const startTime = new Date()
        let count = 0
        let features = []   
        const parser = new Parser()
            .on('data', f => {
                f.tippecanoe = {
                    layer: srcdb.layer,
                    //name: moduleKey, // for test
                    minzoom: srcdb.minzoom,
                    maxzoom: srcdb.maxzoom
                }
                count++
                delete f.properties.SHAPE_Length
                //downstream.write(`\x1e${JSON.stringify(f)}\n`)
                if (f) features.push(f) //adding f to features
            })
            .on('eror', err => {
                console.error(err.stack)
            }) 
            //.on('finish', () => {
            //      downstream.end()
            //})
            .on('finish', async() => {
                for (f of features) {
                    try{
                        await noPressureWrite(downstream, f)
                    } catch (e) {
                        reject(e)
                    }
                }
                resolve(count)
            })          
        const ogr2ogr = spawn(ogr2ogrPath,[
            '-f', 'GeoJSONSeq', 
            '-lco', 'RS=YES',
            '/vsistdout/',
            '-clipdst', bbox[0], bbox[1], bbox[2], bbox[3],
            srcdb.url
        ])

        ogr2ogr.stdout.pipe(parser)
        //ogr2ogr.stdout.pipe(parser)
        //let cols = await ogr2ogr()
        //try {
        //    while (await fetch(moduleKey, downstream) !== 0) {}
        //} catch (e) {
        //    reject(e)
        //}        
        console.log(`${moduleKey}: ${iso(startTime)} --> ${iso()}`)
        resolve()
    })
}

const sleep = (wait) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => { resolve() }, wait)
    })
}

const queue = new Queue(async (t, cb) => {
    const startTime = new Date()
    const moduleKey = t.moduleKey
    const [z, x, y] = t.tile
    const queueStats = queue.getStats()
    const bbox = tilebelt.tileToBBOX([x, y, z])
    const tmpPath = `${mbtilesDir}/part-${z}-${x}-${y}.mbtiles`
    const dstPath = `${mbtilesDir}/${z}-${x}-${y}.mbtiles`

    moduleKeysInProgress.push(moduleKey)
    productionSpinner.setSpinnerTitle(moduleKeysInProgress.join(', '))

    
    const tippecanoe = spawn(tippecanoePath, [
        '--quiet',
        '--no-feature-limit',
        '--no-tile-size-limit',
        '--force',
        '--simplification=2',
        '--drop-rate=1',
        `--minimum-zoom=${minzoom}`,
        `--maximum-zoom=${maxzoom}`,
        '--hilbert',
        `--clip-bounding-box=${bbox.join(', ')}`,
        `--output=${tmpPath}`
    ], { stdio: ['pipe', 'inherit', 'inherit']})
    tippecanoe.on('exit', () =>{
        fs.renameSync(tmpPath, dstPath)
        moduleKeysInProgress = moduleKeysInProgress.filter((v) => !(v === moduleKey))
        productionSpinner.stop()
        process.stdout.write('\n')
        const logString = `${iso()}: [${queueStats.total + 1}/${queueStats.peak}] process ${moduleKey} (${pretty(fs.statSync(dstPath).size)}) took ${TimeFormat.fromMs(new Date() - startTime)}, BBOX ${bbox}`
        console.log(logString)
        if (moduleKeysInProgress.length !== 0) {
            productionSpinner.setSpinnerTitle(moduleKeysInProgress.join(', '))
            productionSpinner.start()
        }
        return cb()
    })

    productionSpinner.start()
    while(!isIdle()){
        await sleep(5000)
    }
    try {await dumpAndModify(bbox, tippecanoe.stdin, moduleKey)
    } catch(e){
        cb(true)
    }
    tippecanoe.stdin.end()

/*
    const downstream = tippecanoe.stdin
    //const downstream = process.stdout 

    const parser = new Parser()
        .on('data', f => {
            f.tippecanoe = {
                layer: srcdb.layer,
                name: moduleKey, // for test
                minzoom: srcdb.minzoom,
                maxzoom: srcdb.maxzoom
            }
            delete f.properties.SHAPE_Length
            //downstream.write(`\x1e${JSON.stringify(f)}\n`)
            downstream.write(`\x1e${JSON.stringify(f.tippecanoe)}\n`)
        }) 
        .on('finish', () => {
             downstream.end()
        })
    const ogr2ogr = spawn(ogr2ogrPath,[
        '-f', 'GeoJSONSeq', 
        '-lco', 'RS=YES',
        '/vsistdout/',
        '-clipdst', bbox[0], bbox[1], bbox[2], bbox[3],
        srcdb.url
    ])

ogr2ogr.stdout.pipe(parser)
*/
},{
    concurrent: config.get('concurrent'), 
    maxRetries: config.get('maxRetries'),
    retryDelay: config.get('retryDelay') 
})


const queueTask = () => {
    for (let tile of srcdb.tiles){
        const moduleKey = `${tile[0]}-${tile[1]}-${tile[2]}`  //moduleKey example: 6-32-20 (z-x-y))
        queue.push({
            moduleKey: moduleKey,
            tile: tile
        })
    }
}

const shutdown = () => {
    console.log('** production system shutdown! Thank you (^_^)/~~ **')
    //process.exit(0)
}

const main = async () => {
    queueTask()
    queue.on('drain', () => {
        shutdown()
    })
}

main()




