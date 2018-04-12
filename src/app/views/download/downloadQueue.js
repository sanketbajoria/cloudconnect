class DownloadQueue{
    constructor(){
        this.queue = [];
    }
    getAll(){
        return this.queue;
    }

    push(item){
        this.queue.push(item);
    }

    clear(){
        this.queue = [];
    }

}

module.exports = new DownloadQueue();