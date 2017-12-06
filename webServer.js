"use strict";

/* jshint node: true */

/*
 * This builds on the webServer of previous projects in that it exports the current
 * directory via webserver listing on a hard code (see portno below) port. It also
 * establishes a connection to the MongoDB named 'cs142project6'.
 *
 * To start the webserver run the command:
 *    node webServer.js
 *
 * Note that anyone able to connect to localhost:portNo will be able to fetch any file accessible
 * to the current user in the current directory or any of its children.
 *
 * This webServer exports the following URLs:
 * /              -  Returns a text status message.  Good for testing web server running.
 * /test          - (Same as /test/info)
 * /test/info     -  Returns the SchemaInfo object from the database (JSON format).  Good
 *                   for testing database connectivity.
 * /test/counts   -  Returns the population counts of the cs142 collections in the database.
 *                   Format is a JSON object with properties being the collection name and
 *                   the values being the counts.
 *
 * The following URLs need to be changed to fetch there reply values from the database.
 * /user/list     -  Returns an array containing all the User objects from the database.
 *                   (JSON format)
 * /user/:id      -  Returns the User object with the _id of id. (JSON format).
 * /photosOfUser/:id' - Returns an array with all the photos of the User (id). Each photo
 *                      should have all the Comments on the Photo (JSON format)
 *
 */

var mongoose = require('mongoose');
var async = require('async');
var session = require('express-session');
var bodyParser = require('body-parser');
var multer = require('multer');
var processFormBody = multer({storage: multer.memoryStorage()}).single('uploadedphoto');
// Load the Mongoose schema for User, Photo, and SchemaInfo
var User = require('./schema/user.js');
var Photo = require('./schema/photo.js');
var SchemaInfo = require('./schema/schemaInfo.js');
var fs = require("fs");
var express = require('express');
var app = express();

//SHA1 Hash password with salt
var hashService = require('./cs142password.js');

// XXX - Your submission should work without this line

mongoose.connect('mongodb://localhost/cs142project6');

// We have the express static module (http://expressjs.com/en/starter/static-files.html) do all
// the work for us.
app.use(express.static(__dirname));

//Add new middleware
app.use(session({secret: 'secretKey', resave: false, saveUninitialized: false}));
app.use(bodyParser.json());

// A middleware to check log-in
app.use(function(request, response, next){
    //If the user is not logged-in
    if(!request.session.login_name){
        //if the user wants to login
        if(request.originalUrl === '/admin/login' || request.originalUrl === '/user'){
            next();
        }else if(request.originalUrl === '/admin/logout'){
            //bad request, status 400
            response.status(400).send("No user logged-in");
            return;
        }else{
            response.status(401).send("Unauthorized, require log-in");
            return;
        }
    }else{
        //user is logged-in, call the next middleware
        next();
    }
    
});

app.get('/', function (request, response) {
    response.send('Simple web server of files from ' + __dirname);
});

app.post('/admin/login', function(request, response){
    var login_name = request.body.login_name;
    var password = request.body.password;
    User.findOne({login_name: login_name}, function(err, user){
        if(err){
            // Some error happened
            response.status(400).send(JSON.stringify(err));
            return;
        }

        if(!user){
            //didn't find a user with login_name
            console.log("Account doesn't exist!");
            response.status(400).send("Account doesn't exist!");
            return;
        }
        if(hashService.doesPasswordMatch(user.password_digest, user.salt, password)){
            //password hash matched
            request.session.login_name = login_name;
            request.session.user_id = user._id;            
            response.status(200).send(JSON.parse(JSON.stringify(user)));
        }else{
            //Wrong password
            response.status(400).send("Bad password!");
        }
        
    });
});

app.post('/admin/logout', function(request, response){
    //Do I really need to delete the properties?
    delete request.session.login_name;
    delete request.session.user_id;
    console.log("Logging out now");
    request.session.destroy(function(err) {
        if(err){
            response.status(400).send("Sorry, an error occurred");
        }else{
            response.status(200).send('');
        }
    });

});

// Add tag to photo of photo_id
app.post('/tag/:photo_id', function(request, response){
    //Do I really need to delete the properties?
    console.log("hello!");
    var p_id = request.params.photo_id;
    var n_tag = request.body.tag;
    Photo.findOne({_id: p_id}).exec(
        function(err, photo){
            if (photo === null) {
                console.log('Photo with _id:' + p_id + ' not found.');
                response.status(400).send('Photo with _id:' + p_id + ' not found.');
                return;
            }
            
            var i, exist = -1;
            for(i=0; i < photo.tags.length; i++){
                if(photo.tags[i].x === n_tag.x && photo.tags[i].y === n_tag.y
                    && photo.tags[i].w === n_tag.w && photo.tags[i].h === n_tag.h
                    && photo.tags[i].text === n_tag.text){
                    exist = i;
                }
            }
            //n_tag does not exist, add it 
            if(exist < 0){
                photo.tags.push(n_tag);
            }else{
                //n_tag exists, remove it!
                photo.tags.splice(exist, 1);
            }
            photo.save();
            
            console.log(n_tag);
            response.status(200).send("success");
        }
    );
});

app.post('/user', function(request, response){
    //Do I really need to delete the properties?
    var login_name = request.body.login_name; 
    var password = request.body.password; 
    var first_name = request.body.first_name; 
    var last_name = request.body.last_name; 
    var location = request.body.location; 
    var description = request.body.description; 
    var occupation = request.body.occupation;

    if(!login_name || !password || !first_name || !last_name){
        response
        .status(400)
        .send("Missing information, cannot signup");
    }
    //check if login_name already exist
    User.findOne({login_name: login_name}).exec(
        function(err, user){
            if(!user){
                //no user with the given login name
                var hashEntry = hashService.makePasswordEntry(password);

                User.create({
                    login_name: login_name, 
                    password_digest: hashEntry.hash,
                    salt: hashEntry.salt, 
                    first_name: first_name, 
                    last_name: last_name, 
                    location: location, 
                    description: description, 
                    occupation: occupation
                }, function(err, userObj){
                    if(err){
                        response
                        .status(400)
                        .send(err.toString());
                    }else{
                        response
                        .status(200)
                        .send();
                    }

                });
            }else{
                // name taken
                response
                .status(400)
                .send("Login Name Already Exist, choose another one please");
            }
        }
        );

});

app.post('/photos/new', function(request, response){
    processFormBody(request, response, function (err) {
        if (err || !request.file) {
            response.status(400).send("Error: No file specified!");
            return;
        }
        // request.file has the following properties of interest
        //      fieldname      - Should be 'uploadedphoto' since that is what we sent
        //      originalname:  - The name of the file the user uploaded
        //      mimetype:      - The mimetype of the image (e.g. 'image/jpeg',  'image/png')
        //      buffer:        - A node Buffer containing the contents of the file
        //      size:          - The size of the file in bytes

        // XXX - Do some validation here.
        if(request.file.mimetype.indexOf('image') === -1 || request.file.size === 0){
            //The file is not an image or it's empty
            response.status(400).send("Not an image file or file empty!");
            return;
        }
        // We need to create the file in the directory "images" under an unique name. We make
        // the original file name unique by adding a unique prefix with a timestamp.
        var timestamp = new Date().valueOf();
        var filename = 'U' +  String(timestamp) + request.file.originalname;

        fs.writeFile("./images/" + filename, request.file.buffer, function (err) {
          // XXX - Once you have the file written into your images directory under the name
          // filename you can create the Photo object in the database
          Photo.create({
                file_name: filename,
                date_time: Date.now(),
                user_id: request.session.user_id,
            }, function (err, photoObj) {
                if (err) {
                    console.error('Error create photo', err);
                    response.status(400).send('Error uploading photo');
                } else {
                    console.log('Adding photo:', filename, ' of user: ', request.session.login_name);
                    response.status(200).send('');
                }
            });
        });
    });

});

app.post('/commentsOfPhoto/:photo_id', function(request, response){
    // Find out which photo the comment is about
    var p_id = request.params.photo_id;
    var commenter = request.session.user_id;

    var commentText = request.body.comment;

    if(!commentText || commentText.length === 0){
        //comment is empty, status 400
        response.status(400).send("Invalid Comment!");
        return;
    }

    Photo.findOne({_id: p_id}).exec(
        function(err, photo){
            if (photo === null) {
                console.log('Photo with _id:' + p_id + ' not found.');
                response.status(400).send('Photo with _id:' + p_id + ' not found.');
                return;
            }
            var commentArr = photo.comments;
            commentArr.push({comment: commentText, user_id: commenter});
            photo.comments = commentArr;
            photo.save();
            response.status(200).send("success");
        }
    );

});

/*
 * Use express to handle argument passing in the URL.  This .get will cause express
 * To accept URLs with /test/<something> and return the something in request.params.p1
 * If implement the get as follows:
 * /test or /test/info - Return the SchemaInfo object of the database in JSON format. This
 *                       is good for testing connectivity with  MongoDB.
 * /test/counts - Return an object with the counts of the different collections in JSON format
 */
app.get('/test/:p1', function (request, response) {
    // Express parses the ":p1" from the URL and returns it in the request.params objects.
    console.log('/test called with param1 = ', request.params.p1);

    var param = request.params.p1 || 'info';

    if (param === 'info') {
        // Fetch the SchemaInfo. There should only one of them. The query of {} will match it.
        SchemaInfo.find({}, function (err, info) {
            if (err) {
                // Query returned an error.  We pass it back to the browser with an Internal Service
                // Error (500) error code.
                console.error('Doing /user/info error:', err);
                response.status(500).send(JSON.stringify(err));
                return;
            }
            if (info.length === 0) {
                // Query didn't return an error but didn't find the SchemaInfo object - This
                // is also an internal error return.
                response.status(500).send('Missing SchemaInfo');
                return;
            }

            // We got the object - return it in JSON format.
            console.log('SchemaInfo', info[0]);
            response.end(JSON.stringify(info[0]));
        });
    } else if (param === 'counts') {
        // In order to return the counts of all the collections we need to do an async
        // call to each collections. That is tricky to do so we use the async package
        // do the work.  We put the collections into array and use async.each to
        // do each .count() query.
        var collections = [
            {name: 'user', collection: User},
            {name: 'photo', collection: Photo},
            {name: 'schemaInfo', collection: SchemaInfo}
        ];
        async.each(collections, function (col, done_callback) {
            col.collection.count({}, function (err, count) {
                col.count = count;
                done_callback(err);
            });
        }, function (err) {
            if (err) {
                response.status(500).send(JSON.stringify(err));
            } else {
                var obj = {};
                for (var i = 0; i < collections.length; i++) {
                    obj[collections[i].name] = collections[i].count;
                }
                response.end(JSON.stringify(obj));

            }
        });
    } else {
        // If we know understand the parameter we return a (Bad Parameter) (400) status.
        response.status(400).send('Bad param ' + param);
    }
});

/*
 * URL /user/list - Return all the User object.
 */
function errorLog(err){
    console.log(err);
}

app.get('/user/list', function (request, response) {
    var userQuery = User.find({});
    userQuery.select("_id first_name last_name").exec(function(err, users){
        if (err) {return errorLog(err);}
        response.status(200).send(users);
    });

});

app.get('/user/list_adv', function (request, response) {
    var userQuery = User.find({});
    var users_created = [];
    //Practice with promises
    userQuery.select("_id first_name last_name").exec(function(err, users){
        if (err) {return errorLog(err);}
        var userPromises = users.map(function (user){
            var user_created = JSON.parse(JSON.stringify(user));
            users_created.push(user_created);
            return [Photo.count({user_id: user._id}).then(function (count) {
                //add photo count
                user_created.photoNum = count;
            }).catch(function(err){
                errorLog(err);
            }), 
            Photo.find({}).select("comments").exec().then(function (comments_arr){
                //loop over all comments and find number of comments for every user
                var i, j, com_count = 0;
                for(i = 0; i < comments_arr.length; i++){
                    console.log((comments_arr[i].comments.length));
                    for(j = 0; j < comments_arr[i].comments.length; j++){
                        //comment belong to this user
                        console.log(user_created._id + ": com_user: " + comments_arr[i].comments[j].user_id);
                        if(comments_arr[i].comments[j].user_id.toString() === user_created._id.toString()){
                            com_count++;
                        }
                    }
                }
                console.log(user_created.first_name + ": com_num: " + com_count);
                user_created.commentNum = com_count;
            }).catch(function(err){
                errorLog(err);
            })
            ];

        });
        //userPromises is a 2D array
        Promise.all(userPromises.map(function(p){
            return Promise.all(p);
        })).then(function(values){
            response.status(200).send(users_created);
        });
        //response.status(200).send(users);
    });

});

/*
 * URL /user/:id - Return the information for User (id)
 */
app.get('/user/:id', function (request, response) {
    var id = request.params.id;
    User.findOne({_id: id})
    .select("_id first_name last_name location description occupation")
    .exec(function(err, user){
        if (user === null) {
            console.log('User with _id:' + id + ' not found.');
            response.status(400).send('User not found');
            return;
        }
        response.status(200).send(user);
    });
});

app.get('/comments/:id', function (request, response) {
    var id = request.params.id;
    Photo.find({}).select("_id user_id comments file_name").exec().then(function (photos_arr){
        if (!photos_arr || photos_arr.length === 0) {
            console.log('Comments not found.');
            response.status(400).send('Comments not found');
            return;
        }
        var p_c_list = [];
        var i, j, com_count = 0;
        for(i = 0; i < photos_arr.length; i++){
            console.log((photos_arr[i].comments.length));
            for(j = 0; j < photos_arr[i].comments.length; j++){
                //comment belong to this user
                if(photos_arr[i].comments[j].user_id.toString() === id.toString()){
                    p_c_list.push({photo: photos_arr[i].file_name, photo_id: photos_arr[i]._id, 
                    photo_owner_id: photos_arr[i].user_id, comment: photos_arr[i].comments[j]});
                }
            }
        }
        response.status(200).send(p_c_list);
    }).catch(function(err){
        errorLog(err);
        response.status(400).send('Oops, cannot find comments');
    });
});

/*
 * URL /photosOfUser/:id - Return the Photos for User (id)
 */

app.get('/photosOfUser/:id', function (request, response) {
    var id = request.params.id;
    Photo.find({user_id: id}).select("_id user_id comments file_name date_time tags")
    .exec(function(err, photos){
        if (!photos || photos.length === 0) {
            console.log('Photos for user with _id:' + id + ' not found.');
            response.status(400).send('No photos found for the user');
            return;
        }
        var photosArray = [];
        async.each(photos, 
            function processComments(photo, callback_p){
                var comment_array = [];
                var pho = JSON.parse(JSON.stringify(photo));
                //Give each photo a new comment array
                pho.comments = comment_array;
                photosArray.push(pho);
                async.each(photo.comments, 
                    function (comment, callback){
                        User.findOne({_id: comment.user_id}, function(err, user){
                            var com = JSON.parse(JSON.stringify(comment));
                            com.user = {_id: user._id, first_name: user.first_name, last_name: user.last_name};
                            delete com.user_id;
                            comment_array.push(com);
                            callback(err);
                        });
                    }, callback_p);
            },
            function(err){
                if(err) {return errorLog(err);}
                response.status(200).send(photosArray);
            }
        );
    });
    
});


var server = app.listen(3000, function () {
    var port = server.address().port;
    console.log('Listening at http://localhost:' + port + ' exporting the directory ' + __dirname);
});


