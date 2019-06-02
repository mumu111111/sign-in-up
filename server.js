//node
var http = require('http')
var fs = require('fs')
var url = require('url')
var port = process.argv[2]

if (!port) {
    console.log('请指定端口号好不啦？\nnode server.js 8888 这样不会吗？')
    process.exit(1)
}

var server = http.createServer(function (request, response) {
    var parsedUrl = url.parse(request.url, true)
    var pathWithQuery = request.url
    var queryString = ''
    if (pathWithQuery.indexOf('?') >= 0) { queryString = pathWithQuery.substring(pathWithQuery.indexOf('?')) }
    var path = parsedUrl.pathname
    var query = parsedUrl.query
    var method = request.method
    console.log('含查询字符串的路径\n' + pathWithQuery)

    if (path === 'sign_up' && method === 'GET') {
        let string = fs.readFileSync('./sign_up.html', 'utf-8')
        response.statusCode = 200
        response.setHeader('Content-Type', 'text/html;charset=utf-8')
        response.write(string)
        response.end()
    } else if (path === 'sign_up' && method === 'POST') {
        //获取字符串 解析成对象  更好的获取email psd值
        readBody(request).then((body) => {
            let strings = body.split('&') // ['e=1', 'psd=2' , 'com=3']
            let hash = {}
            strings.forEach((string) => {
                let parts = string.split('=')
                let key = parts[0]
                let value = parts[1]
                hash[key] = decodeURIComponent(value)  //hash['email'] = '2ese'
            })
            let { email, password } = hash
            //验证邮箱格式
            if (email.indexOf('@') === -1) {
                response.statusCode = 400
                response.setHeader('Content-Type', 'text/json;charset=utf-8')
                response.write(`{
                    "errors": {
                            "email": "invalid"
                      } 
                  }`)
            } else if (password !== password_comfirmation) {
                response.statusCode = 400
                response.write('password not match')
            } else {
                // 写入到数据库users前， 先判断数据库中是否已存在邮箱  

                var users = fs.redeFileSync('./db/users', 'utf-8')
                try {
                    users = JSON.parse(users)
                } catch (expection) {
                    users = []
                }
                let inUse = false
                for (let i = 0; i < users.length; i++) {
                    if (users[i].email === email) {
                        inUse = true
                        break;
                    }
                }
                //注册用户表中有此邮箱存在，不能再次使用
                if (inUse) {
                    response.statusCode = 400
                    response.write('emil in use')
                } else {
                    //用户表中没有此注册邮箱
                    //写入数据库
                    users.push({ email: email, password: password })
                    //存入数据库必须是字符串形式

                    var userString = JSON.stringify(users)
                    fs.writeFileSync('./db/users', userString)
                    response.statusCode = 200
                }
            }
            response.end()
        })
    }
    //请求第4 部分是一段一段上传的， so 如下，怎么获取完整的data
    function readBody(request) {
        return new Promise((resolve, reject) => {
            let body = []
            request.on('data', (chunk) => {//上传的一小段body
                body.push(chunk)
            }).on('end', () => {
                body = Buffer.concat(body).toString()
                resolve(body)
            })
        })
    }



