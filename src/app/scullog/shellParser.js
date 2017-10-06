//http://plnkr.co/edit/swG2TXrkPCIwJsch4RZs?p=preview
var XRegExp = require('xregexp');
var mime = require('mime');

function normalize(data){
    return data.match(/[^\r?\n]+/g);
}

var shell = {
    statusParser: function(data){
        return !data || normalize(data)[0].trim()=='0'
    },
    getStats: {
        cmd: function(path){
            return `test -f "${path}"; echo $?`;
        }
    },
    list: {
        //-rw-r--r-- 1 SA033BA 1049089 1093 2017-08-11 05:42:48.746221600 +0530 LICENSE
        cmd: function(path){
            return `ls -l --time-style=full-iso "${path}"`
        },
        parser: function(data){
            const listRegex = XRegExp(
                `(?<folder>  \\S{1} )                       # folder
                 (?<permission> \\S{9} )            \\s+    # permission
                 (?<userId>   \\S+ )                \\s+    # userId
                 (?<userName> \\S+ )                \\s+    # userName
                 (?<groupId>  \\S+ )                \\s+    # groupId
                 (?<size>  \\d+ )                   \\s+    # sizeId
                 (?<mtime>  \\S+\\s+\\S+\\s+\\S+ )  \\s+    # mtime
                 (?<name>  .+ )                             # name`, 'x');
            
            return normalize(data).map(function (l) {
                return XRegExp.exec(l, listRegex);
            }).filter(function (match) { 
                return match != null; 
            })
            .map(function (match) {
                return {
                    name: match.name,
                    mime: mime.lookup(match.name),
                    folder: match.folder == 'd' ? true : false,
                    size: match.size,
                    mtime: Date.parse(match.mtime)
                }
            });
        }
    },
    exists: {
        cmd: function(path){
            return `test -e "${path}"; echo $?`;
        }
    },
    remove: {
        cmd: function(path){
            return `rm -rf "${path}"`;
        }
    },
    mkdirs: {
        cmd: function(path){
            return `mkdir -p "${path}"`;
        }
    },
    copy: {
        cmd: function(src, dest){
            return `cp "${src}" "${dest}"`;
        }
    },
    move: {
        cmd: function(src, dest){
            return `mv "${src}" "${dest}"`;
        }
    },
    zipFolder: {
        cmd: function(p, tempZipPath){
            return `zip -r "${tempZipPath}" "${p}"`;
        }
    }

}

module.exports = shell