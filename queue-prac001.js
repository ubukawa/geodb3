
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