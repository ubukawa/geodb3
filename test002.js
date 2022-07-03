// test002 -tippecanoe
const config = require('config')
const Parser = require('json-text-sequence').parser
const { spawn } = require('child_process')
const tilebelt = require('@mapbox/tilebelt')

const minzoom = config.get('minzoom')
const maxzoom = config.get('maxzoom')
const srcdb = config.get('srcdb')
const ogr2ogrPath = config.get('ogr2ogrPath')
const tippecanoePath = config.get('tippecanoePath')
const mbtilesDir = config.get('mbtilesDir')


const tippecanoe = spawn(tippecanoePath, [
    '--output=test123.mbtiles',
    `--minimum-zoom=${minzoom}`,
    `--maximum-zoom=${maxzoom}`
], { stdio: ['pipe', 'inherit', 'inherit']})

const downstream = tippecanoe.stdin
//const downstream = process.stdout

const parser = new Parser()
    .on('data', f => {
        f.tippecanoe = {
            layer: srcdb.layer,
            minzoom: srcdb.minzoom,
            maxzoom: srcdb.maxzoom
        }
        delete f.properties.SHAPE_Length
        downstream.write(`\x1e${JSON.stringify(f)}\n`)
        //downstream.write(`\x1e${JSON.stringify(f.properties)}\n`)
    }) 
    .on('finish', () => {
        downstream.end()
    })

const ogr2ogr = spawn(ogr2ogrPath,[
    '-f', 'GeoJSONSeq', 
    '-lco', 'RS=YES',
    '/vsistdout/',
    '-clipdst', 0, 52.4827, 5.625, 55.76573,
    srcdb.url
])

ogr2ogr.stdout.pipe(parser)
//console.log('(^_^)/')

