const config = require('config')
const { spawn } = require('child_process')
const Parser = require('json-text-sequence').parser

const srcdb = config.get('srcdb')
const ogr2ogrPath = config.get('ogr2ogrPath')
const tippecanoePath = config.get('tippecanoePath')

const minzoom = config.get('minzoom')
const maxzoom = config.get('maxzoom')


const tippecanoe = spawn(tippecanoePath, [
    '--output=test3210.mbtiles',
    '--force',
    `--minimum-zoom=${minzoom}`,
    `--maximum-zoom=${maxzoom}`
], { stdio: ['pipe', 'inherit', 'inherit']})

const downstream1 = tippecanoe.stdin


//const downstream1 = process.stdout

const parser = new Parser()
    .on('data', f => {
        f.tippecanoe = {
            layer: srcdb.layer,
            minzoom: srcdb.minzoom,
            maxzoom: srcdb.maxzoom
        }
        //delete f.geometry
        downstream1.write(`\x1e${JSON.stringify(f)}\n`)
    })
    .on('finish', () => {
        downstream1.end()
    }
    )

var ogr2ogr = spawn(ogr2ogrPath, [
    '-f', 'GeoJSONSeq',
    '-lco', 'RS=YES',
    '/vsistdout/',
//    '-clipdst', 0, 52.4827, 5.625, 55.76573,
//    srcdb.url
     'small-data/bndl.geojson'
])
ogr2ogr.on('exit', () => {
    console.log(`end:\n${srcdb.url}`)
})

ogr2ogr.stdout.pipe(parser)



