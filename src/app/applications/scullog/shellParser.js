//http://plnkr.co/edit/swG2TXrkPCIwJsch4RZs?p=preview
var mime = require('mime');

function normalize(data){
    return data.match(/[^\r?\n]+/g);
}

function normalizePath(path){
    return path.replace(/ /g, "\\ ");
}

function normalizeName(name){
    return name.trim().split("/").pop();
}

var shell = {
    statusParser: function(data){
        return !data || normalize(data)[0].trim()=='0'
    },
    getStats: {
        cmd: function(path){
            //return `test -f ${normalizePath(path)}; echo $?; echo $(wc -c < ${normalizePath(path)})`;
            return `if [ -f ${normalizePath(path)} ]; then echo "0"; echo $(wc -c < ${normalizePath(path)}); else echo "1"; echo "0"; fi;`
        },
        parser: function(data){
            var res = normalize(data);
            var isFile = res[0].trim() == 0;
            return {
                folder: !isFile,
                size: isFile?parseInt(res[1].trim()):0
            }
        }
    },
    list: {
        cmd: function(path){
            return `printf "["; c=0; if [ -n "$(ls ${normalizePath(path)})" ]; then for f in ${normalizePath(path)}*; do if [ $c -ne 0 ]; then printf ","; fi; printf "{"; if [ -d "$f" ]; then printf "\\\"isDir\\\":true,\\\"name\\\":\\\"%s\\\",\\\"size\\\":0,\\\"mtime\\\":%d" "$f" "$(date -r "$f" +%s)";  else printf "\\\"isDir\\\":false,\\\"name\\\":\\\"%s\\\",\\\"size\\\":%d,\\\"mtime\\\":%d" "$f" "$(du -B 1 "$f" | cut -f1)" "$(date -r "$f" +%s)"; fi; printf "}"; c=$((c+1)); done; fi; if [ -n "$(ls -A ${normalizePath(path)})" ]; then for f in ${normalizePath(path)}.*; do if [ $c -ne 0 ]; then printf ","; fi; printf "{"; if [ -d "$f" ]; then printf "\\\"isDir\\\":true,\\\"name\\\":\\\"%s\\\",\\\"size\\\":0,\\\"mtime\\\":%d" "$f" "$(date -r "$f" +%s)";  else printf "\\\"isDir\\\":false,\\\"name\\\":\\\"%s\\\",\\\"size\\\":%d,\\\"mtime\\\":%d" "$f" "$((du -B 1 "$f" | cut -f1) 2>/dev/null  || echo 0)" "$(date -r "$f" +%s)"; fi; printf "}"; c=$((c+1)); done; fi; printf "]";`
        },
        parser: function(res){
            var data = JSON.parse(res);
            return data.filter(function(l){
                var name = normalizeName(l.name);
                return name != '.' && name != '..';
            }).map(function(l){
                return{
                    name: normalizeName(l.name),
                    mime: mime.getType(normalizeName(l.name)),
                    folder: l.isDir,
                    size: l.size,
                    mtime: l.mtime*1000 
                }
            })
        }
    }
    /* list: {
        //-rw-r--r-- 1 SA033BA 1049089 1093 2017-08-11 05:42:48.746221600 +0530 LICENSE
        cmd: function(path){
            return `(stat -l -t "%F %T %z" ${normalizePath(path)}* 2> /dev/null || ls -l --time-style=full-iso "${normalizePath(path)}")`
        },
        parser: function(data){
            return normalize(data).map(function(l){
                var tokens = l.split(" ");
                if(tokens.length>8){
                    var len = tokens.length;
                    var zoneIdx 
                    for(var i=len-1;i>=0;i--){
                        if(/[\+-]\d{4}/.test(tokens[i])){
                            zoneIdx = i;
                        }
                    }
                    if(zoneIdx){
                        var name = normalizeName(tokens.slice(zoneIdx+1).join(" "));
                        return {
                            name: name,
                            mime: mime.getType(name),
                            folder: tokens[0][0] == 'd' ? true : false,
                            size: tokens[len-5],
                            mtime: Date.parse(`${tokens[zoneIdx - 2]} ${tokens[zoneIdx - 1]} ${tokens[zoneIdx]}`) 
                        }
                    }
                }
            }).filter(function (match) { 
                return match != null; 
            });
        }
    } */
    /* list: {
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
                    mime: mime.getType(match.name),
                    folder: match.folder == 'd' ? true : false,
                    size: match.size,
                    mtime: Date.parse(match.mtime)
                }
            });
        }
    } */,
    exists: {
        cmd: function(path){
            return `test -e ${normalizePath(path)}; echo $?`;
        }
    },
    remove: {
        cmd: function(path){
            return `rm -rf ${normalizePath(path)}`;
        }
    },
    mkdirs: {
        cmd: function(path){
            return `mkdir -p ${normalizePath(path)}`;
        }
    },
    copy: {
        cmd: function(src, dest){
            return `cp ${normalizePath(src)} ${normalizePath(dest)}`;
        }
    },
    move: {
        cmd: function(src, dest){
            return `mv ${normalizePath(src)} ${normalizePath(dest)}`;
        }
    },
    zipFolder: {
        cmd: function(p, tempZipPath){
            return `zip -r ${normalizePath(tempZipPath)} ${normalizePath(p)}`;
        }
    },
    readFile: {
        cmd: function(path){
            return `cat ${normalizePath(path)}`;
        }
    },
    writeFile: {
        cmd: function(path, options){
            options = options || {};
            return `tee ${options.flags=='a'?'>':''}> ${normalizePath(path)}`
        }
    },
    listDocker: {
        cmd: function(){
            return "docker ps";
        },
        parser: function(data){
            var res = normalize(data);
            var ret = [];
            for(var i=1;i<res.length;i++){
                var token = res[i].split(/\s{4,}/);
                ret.push({
                    containerId: token[0].trim(),
                    image: token[1].trim(),
                    command: token[2].trim(),
                    createdOn: token[3].trim(),
                    status: token[4].trim(),
                    port: token[5].trim(),
                    name: token[6].trim()
                })
            }
            return ret;
        }
    }

}

module.exports = shell