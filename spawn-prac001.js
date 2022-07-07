const { spawn } = require('child_process')
//const cp = require('child_process')
const config = require('config')
const srcdb = config.get('srcdb')

const ogr2ogrPath = config.get('ogr2ogrPath')

 

var child = spawn(ogr2ogrPath, [
    '-f', 'GeoJSONSeq',
    '-lco', 'RS=YES',
    '/vsistdout/',
//    '-clipdst', 0, 52.4827, 5.625, 55.76573,
//    srcdb.url
     'small-data/bndl.geojson'
])
child.stdout.on('data', (data) => {
    console.log(`data:\n${data}`)
})
child.on('exit', () => {
    console.log(`end:\n${srcdb.url}`)
})

//console.log(child.stdout)

/*
var child = cp.spawn(progs.list,["-a"])
child.stdout.on('data', (data) => {
    console.log(`data:\n${data}`)
})
*/


