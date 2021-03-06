const Queue = require('better-queue')

let keyInProgress = []

const sleep = (wait) => {
    return new Promise((resolve, reject) => {
        setTimeout( () => {resolve()}, wait)
    })
}

const queue = new Queue(async (t, cb) => {
    const startTime = new Date()
    const key = t.key

    keyInProgress.push(key)
    console.log(`${keyInProgress} on process`)
    await sleep(5000)
    const endTime = new Date()
    console.log(`${key} ends: ${startTime} --> ${endTime} (^o^)/`)
    keyInProgress = keyInProgress.filter((v) => !(v === key))
    return cb()
},{
    concurrent: 3,
    maxRetries: 3,
    retryDelay: 5000
})


const queueTasks = () => {
    for (let key of ['a', 'b', 'c', 'd', 'e', 'f', 'g']){
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