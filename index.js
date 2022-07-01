const config = require('config')
const Parser = require('json-text-sequence').parser
const { spawn } = require('child_process')
const tilebelt = require('@mapbox/tilebelt')
const Queue = require('better-queue')
//const { getEnabledCategories } = require('trace_events') //why this appeared?

const minzoom = config.get('minzoom')
const maxzoom = config.get('maxzoom')
const srcdb = config.get('srcdb')
const ogr2ogrPath = config.get('ogr2ogrPath')
const tippecanoePath = config.get('tippecanoePath')
const mbtilesDir = config.get('mbtilesDir')

const iso = () => {
    return (new Date()).toISOString()
}


const queue = new Queue(async (t, cb) => {
    const startTime = new Date()
    const moduleKey = t.moduleKey
    const [z, x, y] = t.tile
    const gueueStats = queue.getStats()
    const bbox = tilebelt.tileToBBOX([x, y, z])
    const tmpPath = `${mbtilesDir}/part-${z}-${x}-${y}.mbtiles`
    const dstPath = `${mbtilesDir}/${z}-${x}-${y}.mbtiles`
   
    console.log(`${moduleKey}: BBOX ${bbox} at ${dstPath}`)
    console.log(`${iso()}: ${z}-${x}-${y} test starts.`)

    return cb()

},{
    concurrent: config.get('concurrent'), 
    maxRetries: config.get('maxRetries'),
    retryDelay: config.get('retryDelay') 
  }
    )

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
    console.log('** production system shutdown! Thank you:D**')
    //process.exit(0)
}

const main = async () => {
    queueTask()
    queue.on('drain', () => {
        shutdown()
    })
}

main()

