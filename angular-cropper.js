angular.module('tw.directives.cropper', ['tw.services.fileReader']);

angular.module('tw.directives.cropper').directive('twCropper', ['$parse', '$window', '$document', 'twFileReader', function($parse, $window, $document, twFileReader) {
  var document = $document[0],
  Math = $window.Math;

  return {
    restrict: 'A',
    template: '<div class="cropper-wrapper"><canvas width="{{bounds.width}}" height="{{bounds.height}}"></canvas><input type="range" min="0" max="100" step="1" ng-model="scale.percentage" ng-change="onZoom()" ng-if="scale.max > 1"/> {{scale.percentage}}</div>',
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
      var sx, sy;

      scope.bounds = {
        x: 0,
        y: 0,
        width: parseInt(attrs.width || 0) + parseInt(attrs.transparent || 0),
        height: parseInt(attrs.height || 0) + parseInt(attrs.transparent || 0),
        scale: 1
      };

      scope.scale= {
        current: 0,
        percentage: 0,
        max: 0
      };

      var draw = function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, scope.bounds.x, scope.bounds.y, canvas.width * scope.scale.value, canvas.height * scope.scale.value, 0, 0, canvas.width, canvas.height);
      };

      scope.onZoom = function(){
        if(scope.scale.max > 1){
          scope.scale.value= (scope.scale.max - 1)/100 * scope.scale.percentage + 1;
        }
        zoom(0);
        draw();
      };

      var zoom = function zoom(dScale) {
        var s = scope.scale.value;

        scope.scale.value+= dScale;

        if (scope.scale.value< 1) {
          scope.scale.value= 1;
        } else if (scope.scale.value> scope.scale.max) {
          scope.scale.value= scope.scale.max;
        }

        setCurrentScale(scope.scale.value);

        var scaledWidth = scope.scale.value* canvas.width;
        var scaledHeight = scope.scale.value* canvas.height;
        var oldWidth = s * canvas.width;
        var oldHeight = s * canvas.height;

        var dWidth = scaledWidth - oldWidth;
        var dHeight = scaledWidth - oldHeight;

        scope.bounds.x -= dWidth / 2;
        scope.bounds.y -= dHeight / 2;

          repositionsWithinBounds('x');
          repositionsWithinBounds('y');

      };

      function setCurrentScale(scale){
        scope.$evalAsync(function(){
          if(scope.scale.max > 1 && scale > 0){
            scope.scale.percentage = (scale - 1) / (scope.scale.max - 1)/100 * 10000;
          } else {
            scope.scale.percentage = 0;
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
              scope.scale.value = scope.scale.max = img.height / canvas.height;
              var widthScale = img.width / canvas.width;
              if(widthScale > 1 && widthScale < scope.scale.max){
                scope.scale.value = widthScale;
              }
            } else {
              scope.scale.value = scope.scale.max = img.width / canvas.width;
              var heightScale = img.height / canvas.height;
              if(heightScale > 1 && heightScale < scope.scale.max){
                scope.scale.value= heightScale;
              }
            }

            if(scope.scale.max < 1){
              scope.scale.value= 1;
              scope.scale.max = 1;
            }

            console.log('scope.bounds.x',scope.bounds.x);
            console.log('scope.bounds.y',scope.bounds.y);
            console.log('scale',scope.scale.value);

            setCurrentScale(scope.scale.value);
            centerImage();
            draw();
          };

          img.src = dataURL;
        });
      });

      function centerImage(){
        var heightDifference = img.height / scope.scale.value- canvas.height;
        var widthDifference = img.width / scope.scale.value- canvas.width;
        console.log('heightDifference',heightDifference);
        console.log('widthDifference',widthDifference);

        scope.bounds.y = heightDifference/2;
        scope.bounds.x = widthDifference/2;

          sx = scope.bounds.x;
            sy = scope.bounds.y;

      }

      var sx, sy;
      var move = function move(newX, newY) {
        scope.bounds.x += (sx - newX) * scope.scale.value;
        scope.bounds.y += (sy - newY) * scope.scale.value;

        console.log('scale', scope.scale.value);
        console.log('scope.bounds.x',scope.bounds.x);
        console.log('scope.bounds.y',scope.bounds.y);

          repositionsWithinBounds('x');
       repositionsWithinBounds('y');

        draw();

        sx = newX;
        sy = newY;
      };

      function repositionsWithinBounds(coord){
          var property = coord === 'x' ? 'width' : 'height';
        var scaledDimension = canvas[property] * scope.scale.value;
        var difference = img[property] - scaledDimension;

        if(difference > 0){
          if(scope.bounds[coord] > difference){
            scope.bounds[coord] = difference;
          } else if (scope.bounds[coord] < 0){
            scope.bounds[coord] = 0;
          }
        } else {
          if(scope.bounds[coord] > 0){
            scope.bounds[coord] = 0;
          } else if (scope.bounds[coord] < difference){
            scope.bounds[coord] = difference;
          }
        }
      }

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
