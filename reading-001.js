const config = require('config')
const fs = require('fs')
const Queue = require('better-queue')
const { spawn } = require('child_process')
const Parser = require('json-text-sequence').parser

const srcdb = config.get('srcdb')
const ogr2ogrPath = config.get('ogr2ogrPath')
const tippecanoePath = config.get('tippecanoePath')
const minzoom = config.get('minzoom')
const maxzoom = config.get('maxzoom')

let keyInProgress = []
let idle = true

const isIdle = () => {
    return idle
}


const fsOptions = {
    encoding: "utf8"
  }
  
//for (let key of ['bndl1', 'bndl2', 'bndl3', 'bndl4', 'bndl5', 'bndl6']){
for (let key of ['bndl1', 'bndl2']){

    const stream = fs.createWriteStream(`inter-${key}.geojsons`, fsOptions);
    
    const parser = new Parser()
    .on('data', f => {
        f.tippecanoe = {
            layer: srcdb.layer,
            minzoom: srcdb.minzoom,
            maxzoom: srcdb.maxzoom
        }
        //delete f.geometry
        stream.write(`\x1e${JSON.stringify(f)}\n`)
    })
    .on('finish', () => {
        stream.end()
    }
    )

    const ogr2ogr = spawn(ogr2ogrPath, [
        '-f', 'GeoJSONSeq',
        '-lco', 'RS=YES',
        '/vsistdout/',
    //    '-clipdst', 0, 52.4827, 5.625, 55.76573,
    //    srcdb.url
        `small-data/${key}.geojson`
    ])
    ogr2ogr.on('exit', () => {
        let nowTime = new Date()
        console.log(`${key}: GDAL reading ends at ${nowTime}:\n`)
    })

    ogr2ogr.stdout.pipe(parser)

    stream.on("error", (err)=>{
      if(err)
        console.log(err.message);
    });

}







/*
const dumpAndModify = async(downstream, key) => {
    return new Promise((resolve, reject) =>{
        //from here
        const parser = new Parser()
            .on('data', f => {
                f.tippecanoe = {
                    layer: srcdb.layer,
                    minzoom: srcdb.minzoom,
                    maxzoom: srcdb.maxzoom
                }
                //delete f.geometry
                downstream.write(`\x1e${JSON.stringify(f)}\n`)
            })
            .on('finish', () => {
                downstream.end()
                resolve() //check
            }
            )
        var ogr2ogr = spawn(ogr2ogrPath, [
            '-f', 'GeoJSONSeq',
            '-lco', 'RS=YES',
            '/vsistdout/',
        //    '-clipdst', 0, 52.4827, 5.625, 55.76573,
        //    srcdb.url
            `small-data/${key}.geojson`
        ])
        ogr2ogr.on('exit', () => {
            let nowTime = new Date()
            //console.log(`${key}: GDAL reading ends at ${nowTime}:\n`)
        })

        ogr2ogr.stdout.pipe(parser)
        //until here
    })
}



const sleep = (wait) => {
    return new Promise((resolve, reject) => {
        setTimeout( () => {resolve()}, wait)
    })
}

const queue = new Queue(async (t, cb) => {
    const startTime = new Date()
    const key = t.key
    const bbox = [6,32,20] // will be edited

    keyInProgress.push(key)
    console.log(`[${keyInProgress}] in progress`)
    await sleep(1000)
// conversion
    const tippecanoe = spawn(tippecanoePath, [
        `--output=${key}.mbtiles`,
        '--force',
        '--quiet',
        `--minimum-zoom=${minzoom}`,
        `--maximum-zoom=${maxzoom}`
    ], { stdio: ['pipe', 'inherit', 'inherit']})
       .on('exit', () => {
            const endTime = new Date()
            console.log(`${key}: Tippecanoe ${startTime.toISOString()} --> ${endTime.toISOString()} (^o^)/`)
            keyInProgress = keyInProgress.filter((v) => !(v === key))
            return cb()
        })
    while(!isIdle()){
        await sleep(5000)
    }
    try {
        await dumpAndModify(tippecanoe.stdin, key)
    } catch(e) {
        cb(true)
    }
    tippecanoe.stdin.end()
},{
    concurrent: 2,
    maxRetries: 3,
    retryDelay: 5000
})


const queueTasks = () => {
    for (let key of ['bndl1', 'bndl2', 'bndl3', 'bndl4', 'bndl5', 'bndl6']){
        queue.push({
            key: key
        })
    }
}

const shutdown = () => {
    console.log('shutdown (^_^)')
    process.exit(0)
}

const main = async () =>{
    queueTasks()
    queue.on('drain', () => {
        shutdown()
    })
}

main()
*/