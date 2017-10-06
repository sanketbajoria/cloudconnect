import {HttpService, Promise}  from '../Angular/Angular2';
export class Address{
    $q: Promise;
    $http: HttpService;
    constructor($http: HttpService, $q: Promise) {
        this.$http = $http;
        this.$q = $q
    }
    getBooks(mailerId: String) {
        mailerId = mailerId || '26-450-8961';
        return this.$http.get('https://api-qa.fusion.pitneycloud.com/fusionapi/address', {
            headers: {
                'X-Api-Key': 'TAHb4BcUUe4IZX8D9dFOb8D4vjRXk1195QhfqNXb'
            },
            params:{
                'mailerId': mailerId
            }
        });
  }
}