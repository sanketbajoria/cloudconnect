'use strict';

(function () {
  var crypto = require('crypto');
  
  var app = angular.module('galaxy');
  var jwt = require('jsonwebtoken');
  app.factory("JWTService", function () {
    return {
      createJWTToken: function (data, secret, expiresIn) {
        return jwt.sign(data, secret, {
          expiresIn: expiresIn
        });
      },
      verify: function (token) {
        try {
          var data = jwt.verify(token, secret);
          return data || true;
        } catch (err) {
          return false;
        }
      },
      createSecret: function(len){
        return crypto.randomBytes(len || 64).toString('hex');
      }
    }
  })
})();
