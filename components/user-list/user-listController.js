'use strict';

cs142App.controller('UserListController', ['$scope', '$routeParams', '$resource', '$rootScope', 
    function ($scope, $routeParams, $resource, $rootScope) {
        $scope.main.title = 'Users';

        function retrieveUserList(){
            if($scope.main.admin){
                //if the user logged in
                var resource;
                if($routeParams.adv) {
                    $scope.main.adv_enabled = true;
                    $scope.main.adv_prefix = "adv";
                    resource = $resource('/user/list_adv',undefined,{get: {method: 'get', isArray: true}});   
                }else{
                    resource = $resource('/user/list',undefined,{get: {method: 'get', isArray: true}});
                }
                resource.get({}, function(data){
                    $rootScope.users = data;
                });
            }else{
                //remove user list
                delete $rootScope.users;
            }
        }

        retrieveUserList();

        $scope.$on('user_logged_in', function() {
            //User logged-in now, TODO: do something here, maybe
            retrieveUserList();
        });
        $scope.$on('user_logged_out', function() {
            //User logged-in now, TODO: do something here, maybe
            console.log("Should clear things up" + $scope.main.admin);
            retrieveUserList();
        });

        //$scope.users = window.cs142models.userListModel();
    }]);

