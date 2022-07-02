const config = require('config')
const fs = require('fs')
const Parser = require('json-text-sequence').parser
const { spawn } = require('child_process')
const tilebelt = require('@mapbox/tilebelt')
const TimeFormat = require('hh-mm-ss')
const Queue = require('better-queue')
const pretty = require('prettysize')
const { fstat } = require('fs')
//const { getEnabledCategories } = require('trace_events') //why this appeared?
const Spinner = require('cli-spinner').Spinner

const minzoom = config.get('minzoom')
const maxzoom = config.get('maxzoom')
const srcdb = config.get('srcdb')
const ogr2ogrPath = config.get('ogr2ogrPath')
const tippecanoePath = config.get('tippecanoePath')
const mbtilesDir = config.get('mbtilesDir')
const spinnerString = config.get('spinnerString')

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



const dumpAndModify = async (bbox, downstream, moduleKey) => {
    return new Promise((resolve, reject) => {
        const startTime = new Date()
        const database = srcdb.url //geodatabase location
        console.log(`${startTime}: ${moduleKey} starts!!`)
        const parser = new Parser()
            .on('data', f => {
                f.tippecanoe = {
                    layer: srcdb.layer,
                    minzoom: srcdb.minzoom,
                    maxzoom: srcdb.maxzoom
                }
                delete f.properties.SHAPE_Length
                downstream.write(`\x1e${JSON.stringify(f)}\n`)
            })
            .on('finish', () => {
                downstream.end()
            })
        const ogr2ogr = spawn(org2ogrPath, [
            '-f', 'GeoJSONSeq', 
            '-lco', 'RS=YES',
            '/vsistdout/',
            database
            //`-clipdst ${bbox[0]} ${bbox[1]} ${bbox[2]} ${bbox[3]}`
        ])

        try {
            ogr2ogr.stdout.pipe(parser)
        } catch (e) {
            reject(e)
        }
        release()
        resolve()
        //ogr2ogr.stdout.pipe(parser)

    }

    )

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
        `--output=${tmpPath}`
    ],{ stdio: ['pipe', 'inherit', 'inherit']})
    tippecanoe.on('exit', () => {
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
    while(!isIdle()) {
        await sleep(5000)
    }
    try {
        await dumpAndModify(bbox, tippecanoe.stdin, moduleKey)
    } catch (e) {
        cb(true)
    }

    tippecanoe.stdin.end()
    //console.log(`${moduleKey}: ${iso()}, BBOX ${bbox} at ${dstPath}`)
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

/*
const queueTask = () => {
    for (const t of srcdb.tiles ){
        console.log(`${iso()}: ${t[0]}-${t[1]}-${t[2]} test starts.`)
    }
}
*/

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

