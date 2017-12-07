'use strict';

cs142App.controller('UserDetailController', ['$scope', '$routeParams', '$resource',
  function ($scope, $routeParams, $resource) {
    /*
     * Since the route is specified as '/users/:userId' in $routeProvider config the
     * $routeParams  should have the userId property set with the path from the URL.
     */
    var userId = $routeParams.userId;
    if($routeParams.adv) {
      $scope.main.adv_enabled = true;
      $scope.main.adv_prefix = "adv";
    }
    //console.log('UserDetail of ', userId);
    var resource = $resource('/user/:userId');
    resource.get({userId: userId}, function(data){
      $scope.user = data;
      $scope.main.displaying = $scope.user.first_name + ' ' + $scope.user.last_name;
    });

    resource = $resource('/mention/:user_id',undefined,{get: {method: 'get', isArray: true}});
    resource.get({user_id: userId}, function(data){
      $scope.mentions = data;
    });

    $scope.buttonText = 'See Photos';
    //console.log('window.cs142models.userModel($routeParams.userId)', window.cs142models.userModel(userId));
    $scope.toggleContent = function(){
        if ($scope.buttonText === 'See Photos'){
            $scope.buttonText = 'See Profile';
        }else{
            $scope.buttonText = 'See Photos';
        }
    };
  }]);
