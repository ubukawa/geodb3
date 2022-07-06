//const { spawn } = require('child_process')
const cp = require('child_process')

var progs = {
    list: 'ls',
    copy: 'cp',
    mkdir: 'mkdir'
}

var child = cp.spawn(progs.list,["-a"])
child.stdout.on('data', (data) => {
    console.log(`data:\n${data}`)
})

