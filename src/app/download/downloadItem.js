/**
 * Wrapping Electron Download Item with this class
 */
class DownloadItem{
    constructor(item, server){
        this.id = Math.random();
        this.state = item.getState();
        this.filename = item.getFilename();
        this.url= item.getURL();
        this.savePath = item.getSavePath();
        this.path = this.url.slice(this.url.indexOf("/api") + 4, this.url.indexOf("?"));
        this.totalBytes = item.getTotalBytes();
        this.server = utils.getInstanceName(server);
        this.receivedBytes = 0;
    }
 
}

module.exports = DownloadItem;