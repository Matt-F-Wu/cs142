'use strict';

var cs142App = angular.module('cs142App', ['ngRoute', 'ngMaterial', 'ngResource', 'mentio']).config(function($mdThemingProvider) {
  $mdThemingProvider.theme('default')
    .primaryPalette('green').accentPalette('orange');
});

cs142App.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider.
            when('/login-register/', {
                templateUrl: 'components/login-register/login-registerTemplate.html',
                controller: 'LoginController'
            }).
            when('/users/', {
                templateUrl: 'components/user-list/user-listTemplate.html',
                controller: 'UserListController'
            }).
            when('/users/:userId/', {
                templateUrl: 'components/user-detail/user-detailTemplate.html',
                controller: 'UserDetailController'
            }).
            when('/photos/:userId/', {
                templateUrl: 'components/user-photos/user-photosTemplate.html',
                controller: 'UserPhotosController'
            }).
            when('/:adv/login-register/', {
                templateUrl: 'components/login-register/login-registerTemplate.html',
                controller: 'LoginController'
            }).
            when('/:adv/users/', {
                templateUrl: 'components/user-list/user-listTemplate.html',
                controller: 'UserListController'
            }).
            when('/:adv/users/:userId/', {
                templateUrl: 'components/user-detail/user-detailTemplate.html',
                controller: 'UserDetailController'
            }).
            when('/:adv/photos/:userId/', {
                templateUrl: 'components/user-photos/user-photosTemplate.html',
                controller: 'UserPhotosController'
            }).
            when('/:adv/photos/:userId/:photoId/', {
                templateUrl: 'components/user-photos/user-photosTemplate.html',
                controller: 'UserPhotosController'
            }).
            when('/:adv/comments/:userId/', {
                templateUrl: 'components/user-comments/user-commentsTemplate.html',
                controller: 'UserCommentsController'
            }).
            otherwise({
                redirectTo: '/users'
            });
    }]);

cs142App.controller('MainController', ['$scope', '$location', '$routeParams', 
    '$mdDialog', '$resource', '$rootScope', '$http', 
    function ($scope, $location, $mdDialog, $routeParams, $resource, $rootScope, $http) {
        $scope.main = {};
        $scope.main.title = 'Users';
        $scope.main.adv_enabled = false;
        if($routeParams.adv) {
            $scope.main.adv_enabled = true;
        }

        var service = {
            SaveState: function () {
                sessionStorage.userService = angular.toJson($scope.main.admin);
            },

            RestoreState: function () {
                if(sessionStorage.userService){
                    $scope.main.admin = angular.fromJson(sessionStorage.userService);
                }
            },
        };
        //Save state when the window is about to reload
        window.onbeforeunload = function (event) {
            $rootScope.$broadcast('savestate');
        };
        $rootScope.$on("savestate", service.SaveState);

        $rootScope.$on("$routeChangeStart", function(event, next, current) {
            //Extra credit part 2, try to load session
            if (!$scope.main.admin) {
                //try to restore state
                service.RestoreState();
                if($scope.main.admin){
                    //Successfully restored a session, broadcast event
                    $rootScope.$broadcast('user_logged_in');
                    return;
                }

                // no logged user, redirect to /login-register unless already there
                if (next.templateUrl !== "components/login-register/login-registerTemplate.html") {
                  $location.path("/login-register");
                }
            }
        });

        $scope.main.logout = function(){
            //console.log("What is happening");
            var res = $resource('/admin/logout');
            res.save({}, 
                function(){
                    console.log("Logging out");
                    //Log out successful
                    delete $scope.main.admin;
                    //Extra credit 2, clear sessionStorage
                    delete sessionStorage.userService;
                    $rootScope.$broadcast('user_logged_out');
                    $scope.main.displaying = '';
                    //route to log-in page
                    $location.path("/login-register");
                }, 
                function(err){
                    //TODO: error handling
                    $mdDialog.show(
                      $mdDialog.alert()
                        .clickOutsideToClose(true)
                        .title('Error')
                        .textContent(err.data)
                        .ariaLabel(err.data)
                        .ok('Got it!')
                    );
                });

        };

        $scope.main.changeMode = function(){
            var new_path;
            if($scope.main.adv_enabled){
                $scope.main.adv_prefix = '/adv';
                new_path = '/adv' + $location.path();
                $location.path(new_path);
            }else{
                $scope.main.adv_prefix = '';
                new_path = $location.path().replace(/^\/adv/, '');
                if(/^\/.+\/.+\/.+\//.test(new_path)){
                    //at the view of showing one photo, remove trailing photoId
                    new_path = new_path.replace(/\/[^/]+\/$/, '');
                }
                $location.path(new_path);
            }
        };

        //Fetch Model data from server
        var resource = $resource('/test/info');
        
        function getVersion(){
            resource.get({}, function(data){
                $scope.main.version = data.__v;
            });
        }

        $scope.$on('user_logged_in', function() {
            //User logged-in now, TODO: do something here, maybe
            getVersion();
        });

        $scope.$on('user_logged_out', function() {
            //User logged out, clear version number
            $scope.main.version = '';
        });

        var selectedPhotoFile;   // Holds the last file selected by the user

        // Called on file selection - we simply save a reference to the file in selectedPhotoFile
        $scope.inputFileNameChanged = function (element) {
            selectedPhotoFile = element.files[0];
            //Direct upload
            $scope.uploadPhoto();
        };

        // Has the user selected a file?
        $scope.inputFileNameSelected = function () {
            return !!selectedPhotoFile;
        };

        // Upload the photo file selected by the user using a post request to the URL /photos/new
        $scope.uploadPhoto = function () {
            if (!$scope.inputFileNameSelected()) {
                console.error("uploadPhoto called will no selected file");
                return;
            }
            console.log('fileSubmitted', selectedPhotoFile);

            // Create a DOM form and add the file to it under the name uploadedphoto
            var domForm = new FormData();
            domForm.append('uploadedphoto', selectedPhotoFile);

            // Using $http to POST the form
            $http.post('/photos/new', domForm, {
                transformRequest: angular.identity,
                headers: {'Content-Type': undefined}
            }).then(function successCallback(response){
                // The photo was successfully uploaded. XXX - Do whatever you want on success.
                $rootScope.$broadcast('photo_uploaded');
            }, function errorCallback(response){
                // Couldn't upload the photo. XXX  - Do whatever you want on failure.
                console.error('ERROR uploading photo', response);
            });

        };
    }]);

//Create a new directive for drawing rectangles on canvas
//Restrict A, can only be used as attribute
cs142App.directive("drawing", ['$resource', '$mdDialog', function($resource, $mdDialog){
  return {
    restrict: "A",
    link: function(scope, element, attrs){
      var ctx = element[0].getContext('2d');

      // variable that decides if something should be drawn on mousemove
      var drawing = false;

      // the last coordinates before the current move
      var firstX, lastX, currentX;
      var firstY, lastY, currentY;
      var photo;

      scope.$watch(attrs.drawing, function(value) {
          photo = value;
        });

      element.bind('mousedown', function(event){
        if(event.offsetX!==undefined){
          lastX = event.offsetX;
          lastY = event.offsetY;
        } else { // Firefox compatibility
          lastX = event.layerX - event.currentTarget.offsetLeft;
          lastY = event.layerY - event.currentTarget.offsetTop;
        }

        firstX = lastX;
        firstY = lastY;

        drawing = true;
      });
      element.bind('mousemove', function(event){
        if(drawing){
          // get current mouse position
          if(event.offsetX!==undefined){
            currentX = event.offsetX;
            currentY = event.offsetY;
          } else {
            currentX = event.layerX - event.currentTarget.offsetLeft;
            currentY = event.layerY - event.currentTarget.offsetTop;
          }
          // set current coordinates to last one
          lastX = currentX;
          lastY = currentY;
          reset();
          draw(lastX, lastY);
        }

      });
      element.bind('mouseup', function(event){
        // stop drawing
        function DialogController($scope, $mdDialog, res, users, tag, photo) {
              $scope.users = users;
              $scope.closeDialog = function() {
                $mdDialog.hide();
              };
              $scope.tagComplete = function(){
                tag.user_id = $scope.selectedItem._id;
                tag.text = $scope.selectedItem.first_name + ' ' + $scope.selectedItem.last_name;
                photo.tags.push(tag);

                res.save({tag: tag}, function(data){
                    //clean canvas
                    reset();
                    console.log('Saved tags');
                  }, 
                  function(err){
                    //How do we handle this?
                  }
                );
                $mdDialog.hide();
              };
            }
        drawing = false;
        console.log(photo);
        if(photo){
          //set up resources for dialog
          var res = $resource('/tag/:photo_id', {photo_id: photo._id});
          var tag = {
            x: firstX/photo.cWidth,
            y: firstY/photo.cHeight,
            w: (lastX - firstX)/photo.cWidth,
            h: (lastY - firstY)/photo.cHeight,
          };

          $mdDialog.show({
               parent: angular.element(document.body),
               template:
                 '<md-dialog aria-label="List dialog">' +
                 '  <md-dialog-content> <p style="color: orange; margin: 5px;">Type his/her name</p>'+
                 '   <md-autocomplete style="border: 1px solid orange" md-no-cache="true" md-selected-item="selectedItem" md-items="user in users" md-search-text="searchText" md-item-text="user.first_name + \' \' + user.last_name">' +
                 '     <span>{{ user.first_name }} {{user.last_name}}</span>' +
                 '   </md-autocomplete>' +
                 '  </md-dialog-content>' +
                 '  <md-dialog-actions>' +
                 '    <md-button ng-click="closeDialog()" class="md-primary">' +
                 '      Cancel' +
                 '    </md-button>' +
                 '    <md-button ng-click="tagComplete()" class="md-primary">' +
                 '      Tag' +
                 '    </md-button>' +
                 '  </md-dialog-actions>' +
                 '</md-dialog>',
               locals: {
                 users: scope.main.users,
                 tag: tag,
                 res: res,
                 photo: photo,
               },
               controller: DialogController
            });
        }
      });

      // canvas reset
      function reset(){
       element[0].width = element[0].width; 
      }

      function draw(lX, lY){
        ctx.rect(firstX, firstY, lX - firstX, lY - firstY);
        // color is orange
        ctx.strokeStyle = "#FF8C00";
        // draw it
        ctx.stroke();
      }
    }
  };
}]);

cs142App.run(function($rootScope, $location, $anchorScroll, $routeParams) {
  //when the route is changed scroll to the proper element.
  $rootScope.$on('$routeChangeSuccess', function(newRoute, oldRoute) {
    $location.hash($routeParams.scrollTo);
    $anchorScroll();  
  });
});


