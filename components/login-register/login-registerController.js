'use strict';
cs142App.controller('LoginController', ['$scope', '$routeParams', 
	'$resource', '$location', '$rootScope', '$mdDialog', 
	function($scope, $routeParams, $resource, $location, $rootScope, $mdDialog){
	  //Don't show sign up yet
	  $scope.wannaSignUp = false;
	  $scope.signup = {};

	  $scope.formData = {};
	  if($routeParams.adv) {
	      $scope.main.adv_enabled = true;
	      $scope.main.adv_prefix = "adv";
	  }
	  //when the user click log-in
	  $scope.submit = function(){
	  	var login_name = $scope.formData.login_name;
	  	var password = $scope.formData.password;
	  	var resource = $resource('/admin/login');
	  	// 'save' is a POST method
	    resource.save({login_name: login_name, password: password}, 
	    	function(data){
	    		//log-in successful, dispatch event to all other views
	    		$scope.main.admin = data;
	    		// Should show the log out button too
	    		
        
	    		$rootScope.$broadcast('user_logged_in');

	    		// Go to the user details page
	    		$location.path("/users/" + data._id + "/");
	    	}, 
	    	function errorHandling(err){
	    		//TODO: Error handling
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

	  $scope.signUpSubmit = function(){
	  	if ($scope.userForm.$valid) {
			//Let's create a user
			var res = $resource('/user');
            res.save({login_name: $scope.signup.login_name, 
            	password: $scope.signup.password1, 
            	first_name: $scope.signup.first_name, 
            	last_name: $scope.signup.last_name, 
            	location: $scope.signup.location, 
            	description: $scope.signup.description, 
            	occupation: $scope.signup.occupation
            	}, 
                function(){
                	//If sign up succeed, log user in
                    $scope.formData.login_name = $scope.signup.login_name;
                    $scope.formData.password = $scope.signup.password1;
                    //clean up the data
                    $scope.signup = {};
                    $scope.submit();
                }, 
                function(err){
                    $mdDialog.show(
				      $mdDialog.alert()
				        .clickOutsideToClose(true)
				        .title('Error')
				        .textContent(err.data)
				        .ariaLabel(err.data)
				        .ok('Got it!')
				    );
                });

		}
	  };
}]);