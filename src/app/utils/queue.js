/* global define, Promise */
var Q = require('q');
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports && typeof require === 'function') {
        // CommonJS
        module.exports = factory();
    } else if (typeof define === 'function' && typeof define.amd === 'object') {
        // AMD. Register as an anonymous module.
        define(factory);
    } else {
        // Browser globals
        root.Queue = factory();
    }
})
    (this, function () {
        'use strict';

        var noop = function () { };

        /**
         * @param {*} value
         * @returns {Promise}
         */
        var resolveWith = function (value) {
            if (value && typeof value.then === 'function') {
                return value;
            }

            return new Q.Promise((resolve) => {
                resolve(value);
            });
        };

        class Queue {
            /**
             * It limits concurrently executed promises
             *
             * @param {Number} [maxPendingPromises=Infinity] max number of concurrently executed promises
             * @param {Number} [maxQueuedPromises=Infinity]  max number of queued promises
             * @constructor
             */
            constructor(maxPendingPromises, maxQueuedPromises) {
                this.pendingPromises = [];
                this.maxPendingPromises = typeof maxPendingPromises !== 'undefined' ? maxPendingPromises : Infinity;
                this.maxQueuedPromises = typeof maxQueuedPromises !== 'undefined' ? maxQueuedPromises : Infinity;
                this.queue = [];
            }

            /**
             * add the promise
             * @param {Function} promiseGenerator
             * @return {Promise}
             */
            add(promiseGenerator) {
                var defer = Q.defer();
                // Do not queue to much promises
                if (this.queue.length >= this.maxQueuedPromises) {
                    defer.reject(new Error('Queue limit reached'));
                }else{
                    // Add to queue
                    this.queue.push({
                        promiseGenerator: promiseGenerator,
                        resolve: defer.resolve,
                        reject: defer.reject,
                        notify: defer.notify || noop,
                        promise: defer.promise
                    });
                    this._process();
                }
                return defer.promise;
            };

            /**
             * Number of simultaneously running promises (which are resolving)
             * @return {number}
             */
            getPendingLength() {
                return this.pendingPromises.length;
            };

            /**
             * Number of queued promises (which are waiting)
             * @return {number}
             */
            getQueueLength() {
                return this.queue.length;
            };

            /**
             * Remove the completed promise
             */
            remove(promise) {
                if (promise) {
                    var idx = this.pendingPromises.indexOf(promise);
                    if (idx != -1) {
                        this.pendingPromises.splice(idx, 1);
                    }
                } else {
                    this.pendingPromises.shift();
                }
                this._process();
            };

            /**
             * @returns {boolean} true if first item removed from queue
             * @private
             */
            _process() {
                //console.log("Pending Promises length - " + this.getPendingLength());
                if (this.getPendingLength() >= this.maxPendingPromises) {
                    return false;
                }

                // Remove from queue
                var item = this.queue.shift();
                if (!item) {
                    return false;
                }

                try {
                    this.pendingPromises.push(item.promise);
                    //console.log("Pending Promises length - " + this.getPendingLength());
                    resolveWith(item.promiseGenerator())
                        // Forward all stuff
                        .then((value) => {
                            // It should pass values
                            item.resolve(value);
                        }, (err) => {
                            // It should not mask errors
                            item.reject(err);
                            this.remove(item.promise);
                        }, (message) => {
                            // It should pass notifications
                            item.notify(message);
                        });
                } catch (err) {
                    item.reject(err);
                    this.remove(item.promise);
                }
                return true;
            }
        };

        return Queue;
    });