'use strict';
var downloadQueue = require('./download/downloadQueue');
var DownloadItem = require("./download/downloadItem");
angular.module('galaxy').directive('chromeTabs', function ($compile) {
  return {
    restrict: 'E',
    scope: {
      'api': '='
    },
    replace: true,
    templateUrl: 'tabs/tabs.html',
    controllerAs: 'tabCtrl',
    controller: function ($scope, $element, $attrs, galaxyModal, $timeout) {
      var vm = this;
      vm.findText = function(findNext, backward){
        if(vm.getCurrentWebContent()){
          if(vm.searchText){
            vm.getCurrentWebContent().findInPage(vm.searchText, {forward: !backward, findNext: findNext});
          }
          else{
            vm.getCurrentWebContent().stopFindInPage('clearSelection');
          }
        }
      }

      vm.getCurrentWebContent = function(){
        var view = $scope.api.$views.data('chromeTabViews').getWebview($scope.api.$views.data('chromeTabViews').$currentView);
        if(view.is('webview')){
          return view[0].getWebContents();
        }
      }

      $($element.find('.search-window input')).bind("keypress", function (event) {
        if (event.which === 13) {
          vm.findText(true, false);
        }
      });

      $scope.$watch("api.showSearch", function(newVal, oldVal){
        if(newVal && newVal != oldVal){
          setTimeout(function(){
            $element.find('.search-window input').focus();
          }, 100);
        }
      })

      vm.init = function(root, factory){
        $.fn.chromeTabs = factory(root, jQuery, Draggabilly);
        var $chromeTabs = $element.chromeTabs({ views: 'webviews', allowDoubleClick: false });
        $scope.api = $chromeTabs.data('chromeTabs');
      

        $scope.$on('viewAdded', function (event, $view, i, props) {
          var $webview = $scope.api.$views.data('chromeTabViews').getWebview($view);
          if ($webview.is('webview')) {
            $webview[0].addEventListener('dom-ready', () => {
              $webview[0].getWebContents().on('found-in-page', (event, result) => {
                $scope.$apply(function () {
                  vm.currentMatch = result.activeMatchOrdinal;
                  vm.totalMatch = result.matches;
                })
              })
              $webview[0].getWebContents().session.on('will-download', (event, item, webContents) => {
                $(".-download-btn .fa").addClass("downloading");
                setTimeout(function(){
                  $(".-download-btn .fa").removeClass("downloading");
                }, 2000);
                var downloadItem = new DownloadItem(item, props.__server)
                downloadQueue.push(downloadItem);
                // Set the save path, making Electron not to prompt a save dialog.
                //item.setSavePath('/tmp/save.pdf');
                console.log("Download started - " + item);
                item.on('updated', (event, state) => {
                  downloadItem.state = state;
                  if (state === 'interrupted') {
                    console.log('Download is interrupted but can be resumed')
                  } else if (state === 'progressing') {
                    if (item.isPaused()) {
                      console.log('Download is paused')
                    } else {
                      var bytes = item.getReceivedBytes();
                      console.log(`Received bytes: ${bytes} of ${item.getTotalBytes()}`);
                      downloadItem.receivedBytes = bytes;
                    }
                  }
                })

                item.once('done', (event, state) => {
                  downloadItem.state = state;
                  if (state === 'completed') {
                    console.log('Download successfully')
                  } else {
                    console.log(`Download failed: ${state}`)
                  }
                });
              })
            })

            $webview[0].addEventListener('did-fail-load', (event) => {
              $scope.api.showErrorView($view, event.errorDescription);
            })
          }
        });
      }

      vm.init(window, (window, jQuery, Draggabilly) => {

        // jQuery.

        let $ = jQuery;

        // Begin statics.

        let totalInstances = -1;

        let defaultTabTitle = 'New Tab';
        let defaultUnknownUrlTabTitle = 'Web Page';
        let defaultTabUrl = '';
        let defaultLoadingTabFavicon = 'loading';
        let defaultTabFavicon = 'default';
        let defaultSSHFavicon = 'ssh';
        let defaultScullogFavicon = 'scullog';

        let tabTemplate = `
    <div class="-tab">
      <div class="-background">
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <symbol id="topleft" viewBox="0 0 214 29">
              <path d="M14.3 0.1L214 0.1 214 29 0 29C0 29 12.2 2.6 13.2 1.1 14.3-0.4 14.3 0.1 14.3 0.1Z" />
            </symbol>
            <symbol id="topright" viewBox="0 0 214 29">
              <use xlink:href="#topleft" />
            </symbol>
            <clipPath id="crop">
              <rect class="mask" width="100%" height="100%" x="0" />
            </clipPath>
          </defs>
          <svg width="50%" height="100%" transfrom="scale(-1, 1)">
            <use xlink:href="#topleft" width="214" height="29" class="-background" />
            <use xlink:href="#topleft" width="214" height="29" class="-shadow" />
          </svg>
          <g transform="scale(-1, 1)">
            <svg width="50%" height="100%" x="-100%" y="0">
              <use xlink:href="#topright" width="214" height="29" class="-background" />
              <use xlink:href="#topright" width="214" height="29" class="-shadow" />
            </svg>
          </g>
        </svg>
      </div>
      <div class="-favicon"></div>
      <div class="-title"></div>
      <div class="-close"></div>
    </div>
  `;

        let loaderTemplate = `<div class="-loader"><div class="middle"><i class="fa fa-spinner fa-spin fa-fw"></i><span class="message">Connecting...</span></div>`;

        let errorTemplate = `<div class="-error"><div class="middle"><p><i class="fa fa-exclamation-triangle fa"></i></p><p>This site can't be reached</p><p class="-errorDescription"></p></div></div>`

        let webViewTemplate = `
    <div class="-view"><webview class="-main-view"></webview></div></div>
  `;
        let iframeViewTemplate = `
    <iframe class="-view" sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-orientation-lock allow-pointer-lock"></iframe>
  `; // Note the absence of `allow-top-navigation` in this list; i.e., do not allow frames to break the tabbed interface.
        // This attribute can be altered at runtime using `defaultProps.viewAttrs.sandbox`.
        let divViewTemplate = `<div class="-view"><div class="-main-view"><div class="terminalContainer"><div class="header"><span></span></div><div class="sshTerminal"></div></div></div></div>`;

        // Begin `ChromeTabs{}` class.

        class ChromeTabs {
          get $tabs() {
            return this.$content.find('> .-tab');
          }

          get $currentTab() {
            return this.$tabs.filter('.-current');
          }

          get tabWidth() {
            let width = this.$content.innerWidth() - this.settings.overlapDistance;
            width = (width / this.$tabs.length) + this.settings.overlapDistance;
            return Math.max(this.settings.minWidth, Math.min(this.settings.maxWidth, width));
          }

          get effectiveTabWidth() {
            return this.tabWidth - this.settings.overlapDistance;
          }

          get tabPositions() {
            let positions = [],
              x = 0; // X axis positions.
            let effectiveWidth = this.effectiveTabWidth;

            this.$tabs.each((i, tab) => {
              positions.push(x);
              x += effectiveWidth;
            });
            return positions;
          }

          constructor(settings) {
            this.defaultSettings = {
              obj: '.chrome-tabs',

              minWidth: 45,
              maxWidth: 243,

              leftPadding: 0,
              leftPaddingMobile: 0,

              rightPadding: 300,
              rightPaddingMobile: 45,

              overlapDistance: 14,

              views: 'iframes',
              // `iframes` or `webviews`.
              // `webviews` = Electron compatibility.
              // Or leave empty to disable views entirely.

              allowDragNDrop: true,
              allowDoubleClick: true,
              initial: [], // Array of prop objs.

              defaultProps: {
                url: defaultTabUrl,
                title: defaultTabTitle,
                favicon: defaultTabFavicon,

                loadingFavicon: defaultLoadingTabFavicon,
                unknownUrlTitle: defaultUnknownUrlTabTitle,

                allowClose: true, // Allow tab to be closed?

                viewAttrs: {} // Optional `<iframe>` or `<webview>` attrs.
                // These are simply `key: value` pairs representing HTML attrs.
              },
              debug: false, // Set as `false` in production please.
              // This setting enables console logging, for debugging.
            };
            if (settings && typeof settings !== 'object') {
              throw '`settings` is not an object.';
            }
            this.settings = $.extend(true, {}, this.defaultSettings, settings || {});

            if ($.inArray(typeof this.settings.obj, ['string', 'object']) === -1) {
              throw '`obj` must be a string selector, jQuery, or an element in the DOM.';
            } else if ((this.$obj = $(this.settings.obj).first()).length !== 1) {
              throw 'Unable to locate a single `obj` in the DOM.';
              //
            } else if (typeof this.settings.minWidth !== 'number' || isNaN(this.settings.minWidth)) {
              throw '`minWidth` is not a number.';
            } else if (typeof this.settings.maxWidth !== 'number' || isNaN(this.settings.maxWidth)) {
              throw '`maxWidth` is not a number.';

            } else if (typeof this.settings.leftPadding !== 'number' || isNaN(this.settings.leftPadding)) {
              throw '`leftPadding` is not a number.';
            } else if (typeof this.settings.leftPaddingMobile !== 'number' || isNaN(this.settings.leftPaddingMobile)) {
              throw '`leftPaddingMobile` is not a number.';

            } else if (typeof this.settings.rightPadding !== 'number' || isNaN(this.settings.rightPadding)) {
              throw '`rightPadding` is not a number.';
            } else if (typeof this.settings.rightPaddingMobile !== 'number' || isNaN(this.settings.rightPaddingMobile)) {
              throw '`rightPaddingMobile` is not a number.';

            } else if (typeof this.settings.overlapDistance !== 'number' || isNaN(this.settings.overlapDistance)) {
              throw '`overlapDistance` is not a number.';
              //
            } else if ($.inArray(this.settings.views, ['', 'iframes', 'webviews']) === -1) {
              throw '`views` must be: iframes, webviews, or an empty string.';
              //
            } else if (typeof this.settings.allowDragNDrop !== 'boolean') {
              throw '`allowDragNDrop` is not a boolean.';
            } else if (typeof this.settings.allowDoubleClick !== 'boolean') {
              throw '`allowDoubleClick` is not a boolean.';
            } else if (!(this.settings.initial instanceof Array)) {
              throw '`initial` is not an array.';
              //
            } else if (typeof this.settings.defaultProps !== 'object') {
              throw '`defaultProps` is not an object.';
              //
            } else if ($.inArray(typeof this.settings.debug, ['number', 'boolean']) === -1) {
              throw '`debug` is not a number or boolean.';
            }

            
            var tempTrigger = this.$obj.trigger;
            var that = this;
            this.$obj.trigger = function(){
              tempTrigger.apply(that.$obj, arguments);
              $scope.$emit.apply($scope, Array.from(arguments).reduce(function(r,v){return r.concat(v);},[]));
            }


            this.settings.minWidth = Math.max(1, this.settings.minWidth);
            this.settings.maxWidth = Math.max(1, this.settings.maxWidth);

            this.settings.leftPadding = Math.max(0, this.settings.leftPadding);
            this.settings.leftPaddingMobile = Math.max(0, this.settings.leftPaddingMobile);

            this.settings.rightPadding = Math.max(0, this.settings.rightPadding);
            this.settings.rightPaddingMobile = Math.max(0, this.settings.rightPaddingMobile);

            this.settings.overlapDistance = Math.max(0, this.settings.overlapDistance);

            this.$obj.data('chromeTabs', this); // Instance reference.

            this.$bar = $('<div class="-bar"></div>');
            this.$content = $('<div class="-content"></div>');
            this.$bottomLine = $('<div class="-bottom-line form-inline"></div>');
            this.$views = $('<div class="-views"></div>');
            this.$styles = $('<style></style>');

            this.id = ++totalInstances; // Increment and assign an ID.
            this.draggabillyInstances = []; // Initialize instances.

            this.alwaysOnStyles = `
        @media (max-width: 767px) {
          .chrome-tabs.-id-${this.id} > .-bar {
            padding-left: calc(${this.settings.leftPaddingMobile}px + 4.1em);
            padding-right: calc(${this.settings.rightPaddingMobile}px + 1.2em);
          }
        }
        @media (min-width: 768px) {
          .chrome-tabs.-id-${this.id} > .-bar {
            padding-left: calc(${this.settings.leftPadding}px + 4.1em);
            padding-right: calc(${this.settings.rightPadding}px + 1.2em);
          }
        }`;
            this.$obj.trigger('constructed', [this]);

            this.initialize(); // Initialize.
          }

          initialize() {
            this.addClasses();

            this.addBar();
            this.addContent();
            this.addBottomLine();
            this.addStyles();

            this.addViews();
            this.addEvents();

            this.configureLayout();
            this.fixStackingOrder();
            this.addDraggabilly();

            if (this.settings.initial.length) {
              this.addTabs(this.settings.initial);
            }
            this.$obj.trigger('initialized', [this]);
          }

          toggle(show){
            this.$obj.toggle(show);
          }

          getView($tab){
            return this.$views.data('chromeTabViews').viewAtIndex($tab.index(), true);
          }

          showMainTab($tab){
            var view = this.$views.data('chromeTabViews').viewAtIndex($tab.index(), true);
            this.showMainView(view);
          }

          updateTabLoadingMessage($tab, message){
            var view = this.$views.data('chromeTabViews').viewAtIndex($tab.index(), true);
            view.find(".-loader span.message").text(message);
          }

          showMainView(view){
            view.find(".-main-view").toggle(true);
            view.find(".-loader").toggle(false);
            view.find(".-error").toggle(false);
          }

          showErrorView(view, err){
            view.find(".-error .-errorDescription").text(err);
            view.find(".-main-view").toggle(false);
            view.find(".-loader").toggle(false);
            view.find(".-error").toggle(true);
          }


          updateToolbar($view, $tab) {
            $scope.$emit("updateToolbar", $view, $tab);
          }

          destroy() {
            this.removeDraggabilly();
            this.$tabs.remove();

            this.removeEvents();
            this.removeViews();

            this.removeStyles();
            this.removeBottomLine();
            this.removeContent();
            this.removeBar();

            this.removeClasses();

            this.$obj.removeData('chromeTabs');
            this.$obj.trigger('destroyed', [this]);
            this.$obj.off('.chrome-tabs');
          }

          addClasses() {
            this.$obj.addClass('chrome-tabs');
            this.$obj.addClass('-id-' + this.id);
          }

          removeClasses() {
            this.$obj.removeClass('chrome-tabs');
            this.$obj.removeClass('-id-' + this.id);
          }

          addBar() {
            this.$obj.append(this.$bar);
          }

          removeBar() {
            this.$bar.remove();
          }

          addContent() {
            this.$bar.append(this.$content);
          }

          removeContent() {
            this.$content.remove();
          }

          addBottomLine() {
            this.$bar.append(this.$bottomLine);
            this.$bottomLine.append($compile('<toolbar></toolbar>')($scope))
          }

          removeBottomLine() {
            this.$bottomLine.remove();
          }

          addStyles() {
            this.$bar.append(this.$styles);
            this.$styles.html(this.alwaysOnStyles);
          }

          removeStyles() {
            this.$styles.remove();
          }

          addViews() {
            if (!this.settings.views) {
              return; // Not applicable.
            }
            this.$obj.append(this.$views);

            new ChromeTabViews($.extend({}, {
              parentObj: this.$obj,
              type: this.settings.views,
              defaultProps: this.settings.defaultProps
            }));
          }

          removeViews() {
            if (this.settings.views) {
              this.$views.data('chromeTabViews').destroy();
              this.$views.remove();
            }
          }

          addEvents() {
            $(window).on('resize.chrome-tabs.id-' + this.id, (e) => this.configureLayout());

            if (this.settings.allowDoubleClick) {
              this.$obj.on('dblclick.chrome-tabs', (e) => this.addTab());
            }
            this.$obj.on('click.chrome-tabs', (e) => {
              let $target = $(e.target);

              if ($target.hasClass('-tab')) {
                this.setCurrentTab($target);
              } else if ($target.hasClass('-favicon')) {
                this.setCurrentTab($target.parent('.-tab'));
              } else if ($target.hasClass('-title')) {
                this.setCurrentTab($target.parent('.-tab'));
              } else if ($target.hasClass('-close')) {
                this.removeTab($target.parent('.-tab'));
              }
            });
            var $chromeTabViews = this.$views.data('chromeTabViews');
            /* this.$backBtn.on('click', () => {
              var view = $chromeTabViews.viewAtIndex(this.$currentTab.index(), true);
              this.showMainView(view);
              var webview = $chromeTabViews.getWebview(view)[0];
              setTimeout(function(){
                webview.goBack();
              }, 200);
            });
            this.$forwardBtn.on('click', () => {
              var view = $chromeTabViews.viewAtIndex(this.$currentTab.index(), true);
              this.showMainView(view);
              var webview = $chromeTabViews.getWebview(view)[0];
              setTimeout(function(){
                webview.goForward();
              }, 200);
            });
            this.$reloadBtn.on('click', () => {
              var view = $chromeTabViews.viewAtIndex(this.$currentTab.index(), true);
              this.showMainView(view);
              var webview = $chromeTabViews.getWebview(view)[0];
              setTimeout(function(){
                webview.reload();
              }, 200);
            });
            this.$zoomMinusBtn.on('click', () => {
              var view = $chromeTabViews.viewAtIndex(this.$currentTab.index(), true);
              this.showMainView(view);
              var webview = $chromeTabViews.getWebview(view)[0];
              setTimeout(() => {
                webview.getZoomFactor((zoom) => {
                  zoom = zoom - 0.1;
                  webview.setZoomFactor(zoom);
                  this.$zoom.val(Math.round(zoom * 100));
                });
              }, 200);
            });
            this.$zoomPlusBtn.on('click', () => {
              var view = $chromeTabViews.viewAtIndex(this.$currentTab.index(), true);
              this.showMainView(view);
              var webview = $chromeTabViews.getWebview(view)[0];
              setTimeout(() => {
                webview.getZoomFactor((zoom) => {
                  zoom = zoom + 0.1;
                  webview.setZoomFactor(zoom);
                  this.$zoom.val(Math.round(zoom * 100));
                });
              }, 200);
            }); */

          }

          removeEvents() {
            $(window).off('.chrome-tabs.id-' + this.id);
            this.$obj.off('.chrome-tabs');
          }

          configureLayout() {
            this.$tabs.width(this.tabWidth);

            if (this.settings.allowDragNDrop) {
              this.$tabs.removeClass('-just-dragged');
              this.$tabs.removeClass('-currently-dragged');
            }
            requestAnimationFrame(() => {
              let styles = ''; // Initialize.

              $.each(this.tabPositions, (i, x) => {
                styles += `.chrome-tabs.-id-${this.id} > .-bar > .-content > .-tab:nth-child(${i + 1}) {
            transform: translate3d(${x}px, 0, 0);
          }`;
              }); // This adds an X offset layout for all tabs.
              this.$styles.html(this.alwaysOnStyles + styles); // Set styles.
            });
          }

          fixStackingOrder() {
            let totalTabs = this.$tabs.length;

            this.$tabs.each((i, tab) => {
              let $tab = $(tab);
              let zindex = totalTabs - i;

              if ($tab.hasClass('-current')) {
                zindex = totalTabs + 2;
                this.$bottomLine.css({ zindex: totalTabs + 1 });
              }
              $tab.css({ zindex: zindex });
            });
          }

          addDraggabilly() {
            if (!this.settings.allowDragNDrop) {
              return; // Not applicable.
            }
            this.removeDraggabilly();

            this.$tabs.each((i, tab) => {

              let $tab = $(tab); // Current tab.
              let originalX = this.tabPositions[i];

              let draggabilly = new Draggabilly($tab[0], { axis: 'x', containment: this.$content });
              this.draggabillyInstances.push(draggabilly); // Maintain instances.

              draggabilly.on('dragStart', () => {
                this.$tabs.removeClass('-just-dragged');
                this.$tabs.removeClass('-currently-dragged');

                this.fixStackingOrder();

                this.$bar.addClass('-dragging');
                $tab.addClass('-currently-dragged');
                this.$obj.trigger('tabDragStarted', [$tab, this]);
              });
              draggabilly.on('dragMove', (event, pointer, moveVector) => {
                let $tabs = this.$tabs;
                let prevIndex = $tab.index();
                let ew = this.effectiveTabWidth;
                let prevX = originalX + moveVector.x;

                let newIndex = Math.floor((prevX + (ew / 2)) / ew);
                newIndex = Math.max(0, Math.min(Math.max(0, $tabs.length - 1), newIndex));

                if (prevIndex !== newIndex) {
                  $tab[newIndex < prevIndex ? 'insertBefore' : 'insertAfter']($tabs.eq(newIndex));
                  this.$obj.trigger('tabDragMoved', [$tab, { prevIndex, newIndex }, this]);
                }
              });
              draggabilly.on('dragEnd', () => {
                let finalX = parseFloat($tab.css('left'), 10);
                $tab.css({ transform: 'translate3d(0, 0, 0)' });

                requestAnimationFrame(() => {
                  $tab.css({ left: 0, transform: 'translate3d(' + finalX + 'px, 0, 0)' });

                  requestAnimationFrame(() => {
                    $tab.addClass('-just-dragged');
                    $tab.removeClass('-currently-dragged');
                    setTimeout(() => $tab.removeClass('-just-dragged'), 500);

                    this.setCurrentTab($tab);

                    requestAnimationFrame(() => {
                      this.addDraggabilly();
                      $tab.css({ transform: '' });

                      this.$bar.removeClass('-dragging');
                      this.$obj.trigger('tabDragStopped', [$tab, $tab.index(), this]);
                    });
                  });
                });
              });
            });
          }

          removeDraggabilly() {
            if (!this.settings.allowDragNDrop) {
              return; // Not applicable.
            }
            $.each(this.draggabillyInstances, (i, instance) => instance.destroy());
            this.draggabillyInstances = []; // Reset instance array.
          }

          tabExists(checkProps) {
            if (!checkProps) {
              return this.$tabs.length > 0;
            } else if (typeof checkProps !== 'object') {
              throw 'Invalid properties to check.';
            }
            let $exists = false; // Initialize.

            this.$tabs.each((i, tab) => {
              let $tab = $(tab);
              let matches = true;
              let props = $tab.data('props');

              loop: // For breaks below.

              for (let prop in checkProps) {
                if (typeof props[prop] === 'undefined') {
                  matches = false;
                  break loop;
                }
                if (typeof props[prop] === 'object' && typeof checkProps[prop] === 'object') {
                  for (let _prop in checkProps[prop]) {
                    if (typeof props[prop][_prop] === 'undefined') {
                      matches = false;
                      break loop;
                    }
                    if (props[prop][_prop] !== checkProps[prop][_prop]) {
                      matches = false;
                      break loop;
                    }
                  }
                } else if (props[prop] !== checkProps[prop]) {
                  matches = false;
                  break loop;
                }
              }
              if (matches) {
                $exists = $tab; // Flag as true.
                return false; // Stop `.each()` loop.
              }
            });
            return $exists; // The tab, else `false`.
          }

          addTabIfNotExists(props, setAsCurrent = true, checkProps = undefined) {
            checkProps = checkProps || props;
            let $existingTab = null; // Initialize.

            if (checkProps && ($existingTab = this.tabExists(checkProps))) {
              if (setAsCurrent) this.setCurrentTab($existingTab);
              return $existingTab; // Tab exists.
            }
            return this.addTab(props, setAsCurrent);
          }

          addTab(props, setAsCurrent = true) {
            return this.addTabs([props], setAsCurrent);
          }

          addTabs(propSets, setAsCurrent = true) {
            let $tabs = $(); // Initialize.

            if (!(propSets instanceof Array) || !propSets.length) {
              throw 'Missing or invalid property sets.';
            }
            $.each(propSets, (i, props) => {
              if (props && typeof props !== 'object') {
                throw 'Invalid properties.';
              }
              let $tab = $(tabTemplate);
              this.$content.append($tab);

              $tab.addClass('-just-added');
              setTimeout(() => $tab.removeClass('-just-added'), 500);

              this.$obj.trigger('tabAdded', [$tab, props, this]);

              this.updateTab($tab, props);

              $tabs = $tabs.add($tab);
            });
            if (setAsCurrent) {
              this.setCurrentTab($tabs.first());
            }
            this.configureLayout();
            this.fixStackingOrder();
            this.addDraggabilly();

            return $tabs;
          }

          removeTab($tab) {
            if (!($tab instanceof jQuery) || !$tab.length) {
              throw 'Missing or invalid $tab.';
            }
            $tab = $tab.first(); // One tab only.

            return this.removeTabs($tab);
          }

          removeCurrentTab() {
            if (!this.$currentTab.length) {
              return; // No current tab.
            }
            return this.removeTab(this.$currentTab);
          }

          removeTabs($tabs) {
            if (!($tabs instanceof jQuery) || !$tabs.length) {
              throw 'Missing or invalid $tabs.';
            }
            $tabs.each((i, tab) => {
              let $tab = $(tab);

              if ($tab.hasClass('-current')) {
                if ($tab.prev('.-tab').length) {
                  this.setCurrentTab($tab.prev('.-tab'));
                } else if ($tab.next('.-tab').length) {
                  this.setCurrentTab($tab.next('.-tab'));
                } else {
                  this.setCurrentTab(undefined);
                }
              }
              this.$obj.trigger('tabBeingRemoved', [$tab, this]);
              $tab.remove(); // Remove tab from the DOM.
              this.$obj.trigger('tabRemoved', [$tab, this]);
            });
            this.configureLayout();
            this.fixStackingOrder();
            this.addDraggabilly();
          }

          updateTab($tab, props, via) {
            if (!($tab instanceof jQuery) || !$tab.length) {
              throw 'Missing or invalid $tab.';
            } else if (props && typeof props !== 'object') {
              throw 'Invalid properties.';
            }
            $tab = $tab.first(); // One tab only.

            let prevProps = $tab.data('props') || {};
            let newProps = props || {};

            props = $.extend(true, {}, this.settings.defaultProps, prevProps, newProps);
            $tab.data('props', props); // Update to new props.

            if (props.favicon) {
              if (props.favicon === defaultLoadingTabFavicon || props.favicon === defaultTabFavicon || props.favicon === defaultSSHFavicon || props.favicon === defaultScullogFavicon) {
                $tab.find('> .-favicon').css({ 'background-image': '' }).attr('data-favicon', props.favicon);
              } else {
                $tab.find('> .-favicon').css({ 'background-image': 'url(\'' + props.favicon + '\')' }).attr('data-favicon', '');
              }
            } else { $tab.find('> .-favicon').css({ 'background-image': 'none' }).attr('data-favicon', ''); }

            $tab.find('> .-title').text(props.title);
            $tab.find('> .-close')[props.allowClose ? 'show' : 'hide']();

            this.$obj.trigger('tabUpdated', [$tab, props, via, prevProps, newProps, this]);
          }

          setCurrentTab($tab) {
            if ($tab && (!($tab instanceof jQuery) || !$tab.length)) {
              throw 'Missing or invalid $tab.';
            }
            $tab = $tab ? $tab.first() : $(); // One tab only.

            this.$tabs.removeClass('-current');
            $tab.addClass('-current');
            this.updateToolbar(undefined, $tab);
            this.fixStackingOrder();
            this.$obj.trigger('currentTabChanged', [$tab, this]);
          }
        } // End `ChromeTabs{}` class.

        // Begin `ChromeTabViews{}` class.

        class ChromeTabViews {
          get $views() {
            return this.$content.find('> .-view');
          }

          get $currentView() {
            return this.$views.filter('.-current');
          }

          constructor(settings) {
            this.defaultSettings = {
              parentObj: '.chrome-tabs',

              type: 'iframes', // or `webviews`.
              // `webviews` = Electron compatibility.

              defaultProps: {
                url: defaultTabUrl,
                title: defaultTabTitle,
                favicon: defaultTabFavicon,

                loadingFavicon: defaultLoadingTabFavicon,
                unknownUrlTitle: defaultUnknownUrlTabTitle,

                allowClose: true, // Allow tab to be closed?

                viewAttrs: {} // Optional `<iframe>` or `<webview>` attrs.
                // These are simply `key: value` pairs representing HTML attrs.
              },
              debug: false, // Set as `false` in production please.
              // This setting enables console logging, for debugging.
            };
            if (settings && typeof settings !== 'object') {
              throw '`settings` is not an object.';
            }
            this.settings = $.extend(true, {}, this.defaultSettings, settings || {});

            if ($.inArray(typeof this.settings.parentObj, ['string', 'object']) === -1) {
              throw '`parentObj` must be a string selector, jQuery, or an element in the DOM.';
            } else if ((this.$parentObj = $(this.settings.parentObj).first()).length !== 1) {
              throw 'Unable to locate a single `parentObj` in the DOM.';
            } else if (!((this.$parentObj._ = this.$parentObj.data('chromeTabs')) instanceof ChromeTabs)) {
              throw 'Unable to locate a `chromeTabs` instance in the `parentObj`.';
              //
            } else if ((this.$obj = this.$parentObj.find('> .-views')).length !== 1) {
              throw 'Unable to locate a single `> .-views` object in the DOM.';
              //
            } else if ($.inArray(this.settings.type, ['iframes', 'webviews']) === -1) {
              throw '`type` must be one of: `iframes` or `webviews`.';
              //
            } else if (typeof this.settings.defaultProps !== 'object') {
              throw '`defaultProps` is not an object.';
              //
            } else if ($.inArray(typeof this.settings.debug, ['number', 'boolean']) === -1) {
              throw '`debug` is not a number or boolean.';
            }

            var tempTrigger = this.$obj.trigger;
            var that = this;
            this.$obj.trigger = function(){
              tempTrigger.apply(that.$obj, arguments);
              $scope.$emit.apply($scope, Array.from(arguments).reduce(function(r,v){return r.concat(v);},[]));
            }

            this.$obj.data('chromeTabViews', this); // Instance reference.

            this.viewIndex = []; // Initialize index array.
            this.$content = $('<div class="-content"></div>');

            this.$obj.trigger('constructed', [this]);

            this.initialize(); // Initialize.
          }

          initialize() {
            this.addContent();
            this.addEvents();

            this.$obj.trigger('initialized', [this]);
          }

          destroy() {
            this.$views.remove();

            this.removeEvents();
            this.removeContent();

            this.$obj.removeData('chromeTabViews');
            this.$obj.trigger('destroyed', [this]);
            this.$obj.off('.chrome-tabs');
          }

          addContent() {
            this.$obj.append(this.$content);
          }

          removeContent() {
            this.$content.remove();
          }

          addEvents() {
            this.$parentObj.on('tabAdded.chrome-tabs', (e, $tab, props) => this.addView($tab, props));
            this.$parentObj.on('tabBeingRemoved.chrome-tabs', (e, $tab) => this.removeView(undefined, $tab));

            this.$parentObj.on('tabDragMoved.chrome-tabs', (e, $tab, locations) => this.setViewIndex(undefined, locations.prevIndex, locations.newIndex));
            this.$parentObj.on('tabUpdated.chrome-tabs', (e, $tab, props, via) => this.updateView(undefined, $tab, props, via));
            this.$parentObj.on('currentTabChanged.chrome-tabs', (e, $tab) => this.setCurrentView(undefined, $tab));
          }

          removeEvents() {
            this.$parentObj.off('.chrome-tabs');
          }

          addView($tab, props) {
            if (!($tab instanceof jQuery) || !$tab.length) {
              throw 'Missing or invalid $tab.';
            }
            $tab = $tab.first(); // One tab only.

            let $view = null
            if (utils.isTerminalType(props.__app)) {
              $view = $(divViewTemplate);
            } else {
              $view = $( // Template based on view type.
                this.settings.type === 'webviews' ? webViewTemplate : iframeViewTemplate
              );
            }
            $view.append(loaderTemplate);
            $view.append(errorTemplate);
            $view.data('urlCounter', 0); // Initialize.
            this.$content.append($view); // Add to DOM.

            this.setViewIndex($view, undefined, $tab.index());
            this.$obj.trigger('viewAdded', [$view, this, props]);

            return $view;
          }

          getWebview($view){
            if (!($view instanceof jQuery) || !$view.length) {
              throw 'Missing or invalid $view.';
            }
            $view = $view.first();
            if($view.hasClass("-view") && $view.find("webview.-main-view").length){
              $view = $view.find("webview.-main-view");
            }
            return $view;
          }

          removeView($view, $tab) {
            if ((!($view instanceof jQuery) || !$view.length) && $tab instanceof jQuery && $tab.length) {
              $view = this.viewAtIndex($tab.index(), true);
            }
            if (!($view instanceof jQuery) || !$view.length) {
              throw 'Missing or invalid $view.';
            }
            $view = $view.first(); // One view only.

            this.$obj.trigger('viewBeingRemoved', [$view, this]);
            this.removeViewFromIndex($view), $view.remove();
            this.$obj.trigger('viewRemoved', [$view, this]);
          }

          removeViewFromIndex($view) {
            if (!($view instanceof jQuery) || !$view.length) {
              throw 'Missing or invalid $view.';
            }
            $view = $view.first(); // One view only.

            this.viewIndex.splice(this.mapViewIndex($view, true), 1);
          }

          viewAtIndex(index, require) {
            if (typeof index !== 'number' || isNaN(index) || index < 0) {
              throw 'Missing or invalid index.';
            }
            let $view = this.viewIndex[index] || undefined;

            if (require && (!($view instanceof jQuery) || !$view.length)) {
              throw 'No $view with that index.';
            }
            return $view instanceof jQuery && $view.length ? $view.first() : undefined;
          }

          mapViewIndex($view, require) {
            if (!($view instanceof jQuery) || !$view.length) {
              throw 'Missing or invalid $view.';
            }
            $view = $view.first(); // One view only.

            for (let index = 0; index < this.viewIndex.length; index++) {
              if (this.viewIndex[index].is($view)) return index;
            } // This uses jQuery `.is()` to compare.

            if (require) { // Require?
              throw '$view not in the index.';
            }
            return -1; // Default return value.
          }

          setViewIndex($view, prevIndex, newIndex) {
            if ((!($view instanceof jQuery) || !$view.length) && prevIndex !== undefined) {
              $view = this.viewAtIndex(prevIndex, true);
            }
            if (!($view instanceof jQuery) || !$view.length) {
              throw 'Missing or invalid $view.';
            } else if (typeof newIndex !== 'number' || isNaN(newIndex) || newIndex < 0) {
              throw 'Missing or invalid newIndex.';
            }
            $view = $view.first(); // One view only.

            if ((prevIndex = this.mapViewIndex($view)) !== -1) {
              this.viewIndex.splice(prevIndex, 1);
            } // Remove from current index (if applicable).

            this.viewIndex.splice(newIndex, 0, $view); // New index.
            this.$obj.trigger('viewIndexed', [$view, { prevIndex, newIndex }, this]);
          }

          updateView($view, $tab, props, via) {
            if (via === 'view::state-change') {
              return; // Ignore this quietly.
            } // See state-change events below.

            if ((!($view instanceof jQuery) || !$view.length) && $tab instanceof jQuery && $tab.length) {
              $view = this.viewAtIndex($tab.index(), true);
            }
            if (!($view instanceof jQuery) || !$view.length) {
              throw 'Missing or invalid $view.';
            } else if (props && typeof props !== 'object') {
              throw 'Invalid properties.';
            }
            $view = $view.first(); // One view only.

            let prevProps = $view.data('props') || {};
            let newProps = props || {};

            props = $.extend(true, {}, this.settings.defaultProps, prevProps, newProps);
            $view.data('props', props); // Update to new props after merging.

            $.each(props.viewAttrs, (key, value) => {
              if(this.settings.type === 'webviews'){
                if (key.toLowerCase() !== 'src') this.getWebview($view).attr(key, value === null ? '' : value);
              }else{
                if (key.toLowerCase() !== 'src') $view.attr(key, value === null ? '' : value);
              }
            }); // Anything but `src`, which is handled below.

            if (typeof prevProps.url === 'undefined' || prevProps.url !== props.url) {
              let isFirstUrl = () => { // The first URL?
                return Number($view.data('urlCounter')) === 1;
              }; // True if the first URL, based on counter.

              let $getTab = (require = true) => { // Tab matching view.
                let $tab = this.$parentObj._.$tabs.eq(this.mapViewIndex($view, require));
                if (require && (!($tab instanceof jQuery) || !$tab.length)) throw 'Missing $tab.';
                return $tab; // Otherwise, return the tab now.
              }; // Dynamically, in case it was moved by a user.
              if (!utils.isTerminalType(props.__app)) {
                if (this.settings.type === 'webviews') {
                  let _favicon = ''; // Held until loading is complete.
                  var self = this.$parentObj.data('chromeTabs');
                  var $webview = this.getWebview($view);
                  $webview.off('did-start-loading.chrome-tabs')
                    .on('did-start-loading.chrome-tabs', (e) => {
                      let $tab = $getTab(),
                        props = $view.data('props');
                      self.updateToolbar($view, $tab);
                      // Increment the `<webview>` URL counter.
                      $view.data('urlCounter', $view.data('urlCounter') + 1);
                      
                      $view.find('.-loader').hide();
                      $view.find('.-main-view').show();

                      if (props && props.proxyUrl) {
                        $webview.first()[0].getWebContents().session.setProxy({ proxyRules: props.proxyUrl }, function () {
                          return true; //$view.loadURL(props.url);
                        });
                      }

                      // Use fallbacks on failure.
                      let favicon = props.loadingFavicon;
                      let title = typeof $webview[0].getTitle === 'function' ? $webview[0].getTitle() : '';
                      title = !title && isFirstUrl() ? props.url || props.title : title;
                      title = !title || utils.isScullogType(props.__app) ? props.title : title;

                      // Update the tab favicon and title.
                      this.$parentObj._.updateTab($tab, { favicon, title }, 'view::state-change');

                      // Trigger event after updating tab.
                      this.$obj.trigger('viewStartedLoading', [$view, this]);
                    });

                  $webview.off('did-stop-loading.chrome-tabs')
                    .on('did-stop-loading.chrome-tabs', (e) => {
                      let $tab = $getTab(),
                        props = $view.data('props');
                      self.updateToolbar($view, $tab);
                      // In the case of failure, use fallbacks.
                      let favicon = !_favicon && isFirstUrl() ? props.favicon : _favicon;
                      favicon = !favicon ? this.settings.defaultProps.favicon : favicon;
                      if(utils.isScullogType(props.__app))
                        favicon=defaultScullogFavicon;

                      // Updating tab favicon.
                      this.$parentObj._.updateTab($tab, { favicon }, 'view::state-change');

                      // Trigger event after updating tab.
                      this.$obj.trigger('viewStoppedLoading', [$view, this]);
                    });

                  $webview.off('page-favicon-updated.chrome-tabs')
                    .on('page-favicon-updated.chrome-tabs', (e) => {
                      let $tab = $getTab(),
                        props = $view.data('props');

                      // In the case of failure, use fallbacks.
                      _favicon = e.originalEvent.favicons.length ? e.originalEvent.favicons[0] : '';
                      let favicon = !_favicon && isFirstUrl() ? props.favicon : _favicon;
                      favicon = !favicon ? this.settings.defaultProps.favicon : favicon;

                      // If not loading, go ahead and update favicon.
                      if (typeof $webview[0].isLoading === 'function' && !$webview[0].isLoading()) {
                        this.$parentObj._.updateTab($tab, { favicon }, 'view::state-change');
                      }
                      // Trigger event after updating tab.
                      this.$obj.trigger('viewFaviconUpdated', [$view, favicon, this]);
                    });

                  $webview.off('page-title-updated.chrome-tabs')
                    .on('page-title-updated.chrome-tabs', (e) => {
                      let $tab = $getTab(),
                        props = $view.data('props');

                      // In the case of failure, use fallbacks.
                      let title = e.originalEvent.title || ''; // If not empty.
                      title = !title && typeof $webview[0].getURL === 'function' ? $webview[0].getURL() : title;
                      title = !title ? this.settings.defaultProps.unknownUrlTitle : title;

                      // Title can be updated immediately.
                      this.$parentObj._.updateTab($tab, { title }, 'view::state-change');

                      // Trigger event after updating tab.
                      this.$obj.trigger('viewTitleUpdated', [$view, title, this]);
                    });

                  $webview.attr('src', props.url); // Begin loading.

                } else { // Handle as `<iframe>` (more difficult to work with).
                  let $contentWindow = $($view[0].contentWindow); // jQuery wrapper.
                  let onUnloadHandler; // Referenced again below when reattaching.

                  let tryGettingSameDomainUrl = () => {
                    try { // Same-domain iframes only.
                      return $view.contents().prop('URL');
                    } catch (exception) { } // Fail gracefully.
                  };
                  let tryGettingSameDomainFavicon = () => {
                    try { // Same-domain iframes only.
                      return $.trim($view.contents().find('head > link[rel="shortcut icon"]').prop('href'));
                    } catch (exception) { } // Fail gracefully.
                  };
                  let tryGettingSameDomainTitle = () => {
                    try { // Same-domain iframes only.
                      return $.trim($view.contents().find('head > title').text());
                    } catch (exception) { } // Fail gracefully.
                  };
                  let tryReattachingSameDomainUnloadHandler = () => {
                    try { // Same-domain iframes only.
                      $contentWindow.off('unload.chrome-tabs').on('unload.chrome-tabs', onUnloadHandler);
                    } catch (exception) { } // Fail gracefully.
                  };

                  $contentWindow.off('unload.chrome-tabs')
                    .on('unload.chrome-tabs', (onUnloadHandler = (e) => {
                      let $tab = $getTab(false),
                        props = $view.data('props');

                      if (!($tab instanceof jQuery) || !$tab.length || !$.contains(document, $tab[0])) {
                        return; // e.g., The tab was removed entirely.
                      } // i.e., Unloading occurs on tab removals also.

                      if (!props || !$.contains(document, $view[0])) {
                        return; // e.g., View was removed entirely.
                      } // i.e., Unloading occurs on tab removals also.

                      // Increment the `<iframe>` URL counter.
                      $view.data('urlCounter', $view.data('urlCounter') + 1);

                      // Use fallbacks on failure.
                      let favicon = props.loadingFavicon;
                      let title = isFirstUrl() ? props.url : '';
                      title = !title && isFirstUrl() ? props.title : title;
                      title = !title ? props.title : title;

                      // Update the tab favicon and title. Unloaded = now loading.
                      this.$parentObj._.updateTab($tab, { favicon, title }, 'view::state-change');

                      // Trigger event after updating tab.
                      this.$obj.trigger('viewStartedLoading', [$view, this]);
                    }));

                  $view.off('load.chrome-tabs').on('load.chrome-tabs', (e) => {
                    let $tab = $getTab(),
                      props = $view.data('props');

                    // Reattach `unload` event handler.
                    tryReattachingSameDomainUnloadHandler();

                    // In the case of failure, use fallbacks.
                    let url = tryGettingSameDomainUrl() || '';
                    url = !url && isFirstUrl() ? props.url : url;

                    // In the case of failure, use fallbacks.
                    let favicon = tryGettingSameDomainFavicon() || '';
                    favicon = !favicon && isFirstUrl() ? props.favicon : favicon;
                    favicon = !favicon && url ? url.replace(/^(https?:\/\/[^\/]+).*$/i, '$1') + '/favicon.ico' : favicon;
                    favicon = !favicon ? this.settings.defaultProps.favicon : favicon;

                    // In the case of failure, use fallbacks.
                    let title = tryGettingSameDomainTitle() || '';
                    title = !title && isFirstUrl() ? props.title : title;
                    title = !title ? url : title; // Prefer URL over unknown title.
                    title = !title ? this.settings.defaultProps.unknownUrlTitle : title;

                    // Update the favicon and title.
                    this.$parentObj._.updateTab($tab, { favicon, title }, 'view::state-change');

                    // Trigger these events for iframes too.
                    this.$obj.trigger('viewFaviconUpdated', [$view, favicon, this]);
                    this.$obj.trigger('viewTitleUpdated', [$view, title, this]);

                    // Trigger event after updating tab.
                    this.$obj.trigger('viewStoppedLoading', [$view, this]);
                  });

                  $view.attr('src', props.url); // Begin loading.
                }
              }else{
                let props = $view.data('props');
                this.$parentObj._.updateTab($tab, { favicon: defaultSSHFavicon, title: props.title }, 'view::state-change');
              }

            }
            this.$obj.trigger('viewUpdated', [$view, props, via, prevProps, newProps, this]);
          }

          setCurrentView($view, $tab) {
            if ((!($view instanceof jQuery) || !$view.length) && $tab instanceof jQuery && $tab.length) {
              $view = this.viewAtIndex($tab.index(), true);
            }
            if ($view && (!($view instanceof jQuery) || !$view.length)) {
              throw 'Missing or invalid $view.';
            }
            $view = $view ? $view.first() : $(); // One view only.

            this.$views.removeClass('-current');
            $view.addClass('-current');
            this.$obj.trigger('currentViewChanged', [$view, this]);
          }
        } // End `ChromeTabViews{}` class.

        // Begin jQuery extension as a wrapper for both classes.

        $.fn.chromeTabs = function (settings) {
          return this.each((i, obj) => {
            if (!$(obj).data('chromeTabs')) {
              new ChromeTabs($.extend({}, settings || {}, { obj }));
            }
          });
        };
        // Handle factory return value.

        return $.fn.chromeTabs; // Extension reference.
      });
    },
  };
});