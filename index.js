const config = require('config')
const Parser = require('json-text-sequence').parser
const { spawn } = require('child_process')
const tilebelt = require('@mapbox/tilebelt')

const minzoom = config.get('minzoom')
const maxzoom = config.get('maxzoom')
const srcdb = config.get('srcdb')
const tiles = srcdb.tiles
const ogr2ogrPath = config.get('ogr2ogrPath')
const tippecanoePath = config.get('tippecanoePath')

//console.log(srcdb.tiles[0][1])
//console.log(minzoom)
//console.log(maxzoom)
//console.log(ogr2ogrPath)
//console.log(tippecanoePath)

console.log(tiles)

/*
for (const tile in tiles ){
    //console.log(`${tile[0]}-${tile[1]}-${tile[2]}`)
    console.log(tile)
}
*/