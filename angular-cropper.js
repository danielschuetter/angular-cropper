angular.module('tw.directives.cropper', ['tw.services.fileReader']);

angular.module('tw.directives.cropper').directive('twCropper', ['$parse', '$window', '$document', 'twFileReader', function($parse, $window, $document, twFileReader) {
  var document = $document[0],
  Math = $window.Math;

  return {
    restrict: 'A',
    template: '<div class="cropper-wrapper"><canvas width="{{config.width}}" height="{{config.height}}"></canvas><input type="range" min="0" max="100" step="1" ng-model="scale.current" ng-change="onZoom()" ng-if="scale.max > 1"/> {{scale.current}}</div>',
    controller: ['$scope', '$attrs', '$element', function ($scope, $attrs, $element) {
      var canvas = $element[0].querySelector('canvas');

      // If twCropper attribute is provided
      if ($attrs.twCropper) {
        // Publish this controller to the scope via the expression
        $parse($attrs.twCropper).assign($scope, this);
      }

      this.toDataURL = function toDataURL() {
        return canvas.toDataURL();
      };
    }],
    link: function (scope, el, attrs) {

      var canvas = el[0].querySelector('canvas');
      var ctx = canvas.getContext('2d');
      var img = new Image();
      var x, y, scale;

      scope.config = {
        width: parseInt(attrs.width || 0) + parseInt(attrs.transparent || 0),
        height: parseInt(attrs.height || 0) + parseInt(attrs.transparent || 0)
      };

      scope.scale = {
        current: 0,
        max: 0
      };

      var draw = function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, x, y, canvas.width * scale, canvas.height * scale, 0, 0, canvas.width, canvas.height);
      };

      scope.onZoom = function(){
        if(scope.scale.max > 1){
          scale = (scope.scale.max - 1)/100 * scope.scale.current + 1;
        }
        zoom(0);
        draw();
      };

      var zoom = function zoom(dScale) {
        var s = scale;

        scale += dScale;

        if (scale < 1) {
          scale = 1;
        } else if (scale > scope.scale.max) {
          scale = scope.scale.max;
        }

        setCurrentScale(scale);

        var scaledWidth = scale * canvas.width;
        var scaledHeight = scale * canvas.height;
        var oldWidth = s * canvas.width;
        var oldHeight = s * canvas.height;

        var dWidth = scaledWidth - oldWidth;
        var dHeight = scaledWidth - oldHeight;

        x -= dWidth / 2;
        y -= dHeight / 2;

        console.log('dWidth',dWidth);
        console.log('dHeight',dHeight);

        var differenceWidth = img.width - scaledWidth;
        console.log('differenceWidth',differenceWidth);

        if(differenceWidth > 0){
          if(x > differenceWidth){
            x = differenceWidth;
          } else if (x < 0){
            x = 0;
          }
        } else {
          if(x > 0){
            x = 0;
          } else if (x < differenceWidth){
            x = differenceWidth;
          }
        }

        var differenceHeight = img.height - scaledHeight;

        if(differenceHeight > 0){
          if(y > differenceHeight){
            y = differenceHeight;
          } else if (y < 0){
            y = 0;
          }
        } else {
          if(y > 0){
            y = 0;
          } else if (y < differenceHeight){
            y = differenceHeight;
          }
        }
      };

      function setCurrentScale(scale){
        scope.$evalAsync(function(){
          if(scope.scale.max > 1 && scale > 0){
            scope.scale.current = (scale - 1) / (scope.scale.max - 1)/100 * 10000;
          } else {
            scope.scale.current = 0;
          }
        });
      }

      scope.$watch(attrs.source, function(newVal) {
        if (!newVal) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          return;
        }

        twFileReader.readAsDataURL(newVal).then(function(dataURL) {
          img.onload = function() {

            if (img.width > img.height) {
              scale = scope.scale.max = img.height / canvas.height;
              var widthScale = img.width / canvas.width;
              if(widthScale > 1 && widthScale < scope.scale.max){
                scale = widthScale;
              }
            } else {
              scale = scope.scale.max = img.width / canvas.width;
              var heightScale = img.height / canvas.height;
              if(heightScale > 1 && heightScale < scope.scale.max){
                scale = heightScale;
              }
            }

            if(scope.scale.max < 1){
              scale = 1;
              scope.scale.max = 1;
            }

            console.log('x',x);
            console.log('y',y);
            console.log('scale',scale);

            setCurrentScale(scale);
            centerImage();
            draw();
          };

          img.src = dataURL;
        });
      });

      function centerImage(){
        var heightDifference = img.height / scale - canvas.height;
        var widthDifference = img.width / scale - canvas.width;
        console.log('heightDifference',heightDifference);
        console.log('widthDifference',widthDifference);

        y = heightDifference/2;
        x = widthDifference/2;

      }

      var sx, sy;
      var move = function move(newX, newY) {
        x += (sx - newX) * scale;
        y += (sy - newY) * scale;

        console.log('scale', scale);
        console.log('x',x);
        console.log('y',y);

        var scaledWidth = canvas.width * scale;
        var differenceWidth = img.width - scaledWidth;
        console.log('differenceWidth',differenceWidth);

        if(differenceWidth > 0){
          if(x > differenceWidth){
            x = differenceWidth;
          } else if (x < 0){
            x = 0;
          }
        } else {
          if(x > 0){
            x = 0;
          } else if (x < differenceWidth){
            x = differenceWidth;
          }
        }

        var scaledHeight = canvas.height * scale;
        differenceHeight = img.height - scaledHeight;

        if(differenceHeight > 0){
          if(y > differenceHeight){
            y = differenceHeight;
          } else if (y < 0){
            y = 0;
          }
        } else {
          if(y > 0){
            y = 0;
          } else if (y < differenceHeight){
            y = differenceHeight;
          }
        }

        draw();

        sx = newX;
        sy = newY;
      };

      var mousemove = function mousemove(e) {
        move(e.clientX, e.clientY);
      };

      var d = null;
      var pinch = function pinch(touch1, touch2) {
        var x1 = touch1.clientX;
        var y1 = touch1.clientY;
        var x2 = touch2.clientX;
        var y2 = touch2.clientY;

        var newD = Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2));

        if (d !== null) {
          var dx = newD - d;

          zoom(dx * -.015);

          draw();
        }

        d = newD;
      };

      var touchmove = function touchmove(e) {
        if (e.touches.length === 1) {
          move(e.touches[0].clientX, e.touches[0].clientY);
        } else if (e.touches.length === 2) {
          pinch(e.touches[0], e.touches[1]);
        }
      };

      var start = function(x, y) {
        if (!img.src) {
          return;
        }

        sx = x;
        sy = y;

        $document.on('mousemove', mousemove);
        $document.on('touchmove', touchmove);
      };

      var mousedown = function mousedown(e) {
        start(e.clientX, e.clientY);
      };

      var touchstart = function touchstart(e) {
        e.preventDefault();

        if (e.touches.length === 1) {
          start(e.touches[0].clientX, e.touches[0].clientY);
        }
      };

      angular.element(canvas).on('mousedown', mousedown);
      angular.element(canvas).on('touchstart', touchstart);

      var end = function end() {
        $document.off('mousemove', mousemove);
        $document.off('touchmove', touchmove);

        d = null;
      };

      $document.on('mouseup touchend', end);

      angular.element(canvas).on('wheel', function (e) {
        e.preventDefault();

        e = e.originalEvent || e;

        if (!img.src || scope.scale.max <= 1) {
          return;
        }

        if (e.deltaY < 0) {
          zoom(-.05);
        } else {
          zoom(.05);
        }

        draw();
      });
    }
  };
}]);
