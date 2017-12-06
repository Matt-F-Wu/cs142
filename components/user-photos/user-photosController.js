'use strict';

cs142App.controller('UserPhotosController', ['$scope', '$routeParams', '$resource', '$timeout',
  function($scope, $routeParams, $resource, $timeout) {
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

  }]);
