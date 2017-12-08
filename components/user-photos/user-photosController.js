'use strict';

cs142App.controller('UserPhotosController', ['$scope', '$routeParams', '$resource', '$timeout', '$mdDialog', 'mentioUtil',
  function($scope, $routeParams, $resource, $timeout, $mdDialog, mentioUtil) {
    /*
     * Since the route is specified as '/photos/:userId' in $routeProvider config the
     * $routeParams  should have the userId property set with the path from the URL.
     */
    //Set up canvas

    var resource;
    var userId = $routeParams.userId;
    if($routeParams.adv) {
      $scope.main.adv_enabled = true;
      $scope.main.adv_prefix = "adv";
    }
    $scope.adv = {};

    //for @mentions
    $scope.people = [];

    console.log($scope.main.users);

    $scope.counter = 0;

    $scope.removeTag = function(tag, photo){
      var index = photo.tags.indexOf(tag);
      photo.tags.splice(index, 1);
      //remove tag on server
      var res = $resource('/tag/:photo_id', {photo_id: photo._id});

      res.save({tag: tag}, function(data){
          //Don't do anything
          console.log('removed tags');
        }, 
        function(err){
          //How do we handle this?
        }
      );
    };

    $scope.submit = function(p_id){
      //Immediately display this new comment
      var newComment;
      if(!$scope.main.adv_enabled){
        for(var i = 0; i < $scope.photos.length; i++){
          if($scope.photos[i]._id === p_id){
            //Found the photo that this comment is for
            
            var mentArr = processComment($scope.photos[i]);
            if(mentArr === null) {
              //some @ mentions were wrong
              return;
            }if(mentArr !== []){
              //save mentions on server
              resource = $resource('/mention');
              resource.save({mentions: mentArr}, function(data){
                    //Don't do anything
                  }, 
                  function(err){
                    //How do we handle this?
                  }
              );
            }
            newComment = $scope.photos[i].newComment;
            $scope.photos[i].newComment = '';
            console.log(newComment);
            $scope.photos[i].comments.push({
              user: {
                first_name: $scope.main.admin.first_name, 
                last_name: $scope.main.admin.last_name,
              },
              date_time: Date.now(),
              comment: newComment,
            });
          }
        }
      }else{
        newComment = $scope.newComment;
        $scope.newComment = '';
        $scope.adv.photo.comments.push({
              user: {
                first_name: $scope.main.admin.first_name, 
                last_name: $scope.main.admin.last_name,
              },
              date_time: Date.now(),
              comment: newComment,
            });
      }
      resource = $resource('/commentsOfPhoto/:photo_id', {photo_id: p_id});
      resource.save({comment: newComment}, function(data){
            //Don't do anything
          }, 
          function(err){
            //How do we handle this?
          }
        );
    };
    //console.log('UserPhoto of ', $routeParams.userId);
    resource = $resource('/user/:userId');
    resource.get({userId: userId}, function(data){
        
      $scope.user = data;
      $scope.main.displaying = 'Photos of ' +
        $scope.user.first_name + ' ' + $scope.user.last_name;
        
    });

    function prepareCanvas(){
      var imgcav_box = document.getElementsByClassName("insideWrapper");
      var i, scale;
      for (i = 0; i < imgcav_box.length; i++){
        console.log(imgcav_box[i].children[0].clientWidth + " px");
        $scope.photos[i].cWidth = imgcav_box[i].children[0].clientWidth;
        scale = imgcav_box[i].children[0].clientWidth * 1.0 / imgcav_box[i].children[0].naturalWidth;
        $scope.photos[i].cHeight = imgcav_box[i].children[0].naturalHeight * scale;
      }
    }
    
    function fetchPhotos(){
      //console.log('window.cs142models.photoOfUserModel($routeParams.userId)',window.cs142models.photoOfUserModel(userId));
      resource = $resource('/photosOfUser/:userId',undefined,{get: {method: 'get', isArray: true}});
      resource.get({userId: userId}, function(data){
        var i, p;
        $scope.photos = data;
        if($scope.main.adv_enabled){
          //show the second layout
          for(i = 0; i < $scope.photos.length; i++){
            p = $scope.photos[i];
            
            if(!$routeParams.photoId){
              //just show first photo                  
              $scope.adv.photo = p;
              $scope.noPrev = true;
              $scope.adv.nextP = $scope.photos[1]._id;
              break;
            }
            if(p._id === $routeParams.photoId){
              //display the photo with the right ID
              $scope.adv.photo = p;
              if(i-1 >= 0) {
                $scope.noPrev = false;
                $scope.adv.prevP = $scope.photos[i-1]._id;
              }else{
                // No previous
                $scope.noPrev = true;
                $scope.adv.prevP = $scope.photos[i]._id;
              }
              if(i+1 < $scope.photos.length) {
                $scope.noNext = false;
                $scope.adv.nextP = $scope.photos[i+1]._id;
              }else{
                $scope.noNext = true;
                $scope.adv.nextP = $scope.photos[i]._id;
              }
              break;
            }
          }
        }
        
      });
    }

    $timeout(prepareCanvas, 50);

    fetchPhotos();

    $scope.$on('photo_uploaded', function() {
    //A photo upload happened for the logged in user
      if($scope.main.admin._id === userId){
        //We are displaying the photos of the uploader, need refresh
        fetchPhotos();
      }
    });

    $scope.searchPeople = function(term) {
        console.log("What is happening?");
        var peopleList = [];
        angular.forEach($scope.main.users, function(person) {
            if (person.first_name.toUpperCase().indexOf(term.toUpperCase()) >= 0 || person.last_name.toUpperCase().indexOf(term.toUpperCase()) >= 0) {
                peopleList.push(person);
            }
        });
        $scope.people = peopleList;
        return peopleList;
    };

    $scope.getTagTextRaw = function(user) {
        console.log('returning shit');
        return '@' + user.first_name + ' ' + user.last_name;
    };

    function processComment(photo){
      var i, j;
      var findMentions = /@\w+ \w+/i;
      var resArr = [];
      var mentArr = photo.newComment.match(findMentions);
      if(!mentArr){
        //There is no @mentions
        console.log("what the heck?");
        if(photo.newComment.match(/@\w+/i)){
          //incomplete mention, show error:
          $mdDialog.show(
            $mdDialog.alert()
              .clickOutsideToClose(true)
              .title('Error')
              .textContent("@Metioned user does not exist! Use full name please!")
              .ok('Got it!')
          );
          return null;
        }else{
          return [];
        }
      }
      for(i = 0; i<mentArr.length; i++){
        //remove the at sign
        var name = mentArr[i].slice(1).split(" ");
        if (name.length < 2){
          return null;
        }
        var found = false;
        for(j = 0; j < $scope.main.users.length; j++){
          if ($scope.main.users[j].first_name.toUpperCase() === name[0].toUpperCase() &&
           $scope.main.users[j].last_name.toUpperCase() === name[1].toUpperCase()) {
              //found something, this is a valid @ mention
              found = true;
              //turn first letter to capitalized for easy processing later on
              var fixCap = '@' + toTitleCase(name[0]) + ' ' + toTitleCase(name[1]);
              //add to resArr
              resArr.push({user_id: $scope.main.users[j], 
                text: fixCap, 
                photo_id: photo._id,
                photo_owner: photo.user_id, 
                photo_name: photo.file_name,
                user_first_name: $scope.user.first_name,
                user_last_name: $scope.user.last_name});
              photo.newComment = photo.newComment.replace(mentArr[i], fixCap);
          }
        }

        if(!found){
          //remove the wrond tag
          photo.newComment = photo.newComment.replace(mentArr[i], "");
          $mdDialog.show(
            $mdDialog.alert()
              .clickOutsideToClose(true)
              .title('Error')
              .textContent("User: " + mentArr[i] + " does not exist! Removed @mention!")
              .ok('Got it!')
          );
          return null;
        }

      }
      return resArr;
    }

    function toTitleCase(str){
      return str.replace(/\w\S*/g, 
        function(txt){
          return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }

    $scope.toggleLike = function(photo){
      var likes = photo.likes;
      
      if(!likes){
        //likes is undefined, [] or null
        likes = [];
      }
      //if the user already liked the photo
      var index = likes.indexOf($scope.user._id);
      console.log(index);
      if(index >= 0){
        likes.splice(index, 1);
      }else{
        //user hasn't liked, add to likes
        likes.push($scope.user._id);
      }

      photo.likes = likes;

      console.log(likes);

      var res = $resource('/likes/:photo_id', {photo_id: photo._id}, { save: { method: 'POST', isArray: true } });

      res.save({likes: likes}, function(data){
          //Don't do anything
          console.log('Done!');
        }, 
        function(err){
          //How do we handle this?
        }
      );

    }

  }]);
