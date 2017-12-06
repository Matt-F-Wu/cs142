'use strict';

cs142App.controller('UserCommentsController', ['$scope', '$routeParams', '$resource', 
    function ($scope, $routeParams, $resource) {
        $scope.main.title = 'Comments';
        var userId = $routeParams.userId;
        var resource;
        if($routeParams.adv) {
            $scope.main.adv_enabled = true;
            $scope.main.adv_prefix = "adv";

            resource = $resource('/comments/:id',undefined,{get: {method: 'get', isArray: true}});   
            resource.get({id: userId}, function(data){
                $scope.p_c_list = data;
                $scope.main.displaying = "Comments";
            });
        }
        
        //$scope.users = window.cs142models.userListModel();
    }]);

