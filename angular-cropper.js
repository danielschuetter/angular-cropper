angular.module('tw.directives.cropper', ['tw.services.fileReader']);

angular.module('tw.directives.cropper').directive('twCropper', ['$parse', '$window', '$document', 'twFileReader', function ($parse, $window, $document, twFileReader) {
  var document = $document[0],
    Math = $window.Math;

  return {
    restrict: 'A',
    templateUrl: function ($element, $attrs) {
      return $attrs.templateUrl || 'template/cropper.html';
    },
    controller: ['$scope', '$attrs', '$element', function ($scope, $attrs, $element) {
      var canvas = $element[0].querySelector('canvas');
      var bufferCanvas = null;

      var buffer = parseInt($attrs.buffer || 0);

      if (buffer > 0) {
        bufferCanvas = document.createElement('canvas');
        bufferCanvas.height = parseInt($attrs.height || 0);
        bufferCanvas.width = parseInt($attrs.width || 0);
      }

      // If twCropper attribute is provided
      if ($attrs.twCropper) {
        // Publish this controller to the scope via the expression
        $parse($attrs.twCropper).assign($scope, this);
      }

      this.toDataURL = function toDataURL() {
        if (buffer > 0) {
          var imageData = canvas.getContext("2d").getImageData(buffer, buffer, bufferCanvas.width, bufferCanvas.height);
          bufferCanvas.getContext("2d").putImageData(imageData, 0, 0);
          return bufferCanvas.toDataURL();
        } else {
          return canvas.toDataURL();
        }
      };
    }],
    link: function (scope, el, attrs) {

      var canvas = el[0].querySelector('canvas');
      var ctx = canvas.getContext('2d');
      var img = new Image();
      var sx, sy;
      var filledClassName = 'filled';

      var buffer = parseInt(attrs.buffer || 0);
      var bufferFillColor = attrs.bufferFillColor || 'rgba(242,242,242,0.7)';

      scope.bounds = {
        x: 0,
        y: 0,
        offsetX: 0,
        offsetY: 0,
        width: parseInt(attrs.width || 0) + buffer * 2,
        height: parseInt(attrs.height || 0) + buffer * 2
      };

      scope.scale = {
        value: 0,
        percentage: 0,
        max: 0
      };

      var draw = function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, scope.bounds.x + scope.bounds.offsetX, scope.bounds.y + scope.bounds.offsetY, canvas.width * scope.scale.value, canvas.height * scope.scale.value, scope.bounds.offsetX, scope.bounds.offsetY, canvas.width, canvas.height);
        if (buffer) {

          ctx.fillStyle = bufferFillColor;
          ctx.fillRect(0, 0, buffer, canvas.height);
          ctx.fillRect(canvas.width - buffer, 0, buffer, canvas.height);
          ctx.fillRect(buffer, 0, canvas.width - 2 * buffer, buffer);
          ctx.fillRect(buffer, canvas.height - buffer, canvas.width - 2 * buffer, buffer);
        }
      };

      scope.onZoom = function () {
        var difference = (scope.scale.max - 1) / 100 * (100 - scope.scale.percentage) + 1 - scope.scale.value;
        zoom(difference);
        draw();
      };


      scope.zoom = function zoomAndDraw(dScale) {
        zoom(dScale);
        draw();
      };

      function zoom(dScale) {
        var s = scope.scale.value;

        scope.scale.value += dScale;

        if (scope.scale.value < 1) {
          scope.scale.value = 1;
        } else if (scope.scale.value > scope.scale.max) {
          scope.scale.value = scope.scale.max;
        }

        setCurrentScale(scope.scale.value);

        var scaledWidth = scope.scale.value * canvas.width;
        var scaledHeight = scope.scale.value * canvas.height;
        var oldWidth = s * canvas.width;
        var oldHeight = s * canvas.height;

        var dWidth = scaledWidth - oldWidth;
        var dHeight = scaledHeight - oldHeight;

        scope.bounds.x -= dWidth / 2;
        scope.bounds.y -= dHeight / 2;

        repositionsWithinBounds('x');
        repositionsWithinBounds('y');

      };

      function setCurrentScale(scale) {
        scope.$evalAsync(function () {
          if (scope.scale.max > 1 && scale > 0) {
            scope.scale.percentage = 100 - ((scale - 1) / (scope.scale.max - 1) / 100 * 10000);
          } else {
            scope.scale.percentage = 100;
          }
        });
      }

      scope.$watch(attrs.source, function (newVal) {
        if (!newVal) {
          el[0].classList.remove(filledClassName);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          return;
        }

        twFileReader.readAsDataURL(newVal).then(function (dataURL) {
          img.onload = function () {

            el[0].classList.add(filledClassName);

            if (img.width > img.height) {
              scope.scale.value = scope.scale.max = img.height / (canvas.height - 2 * buffer);
              var widthScale = img.width / (canvas.width - 2 * buffer);
              if (widthScale > 1 && widthScale < scope.scale.max) {
                scope.scale.value = widthScale;
              }
            } else {
              scope.scale.value = scope.scale.max = img.width / (canvas.width - 2 * buffer);
              var heightScale = img.height / (canvas.height - 2 * buffer);
              if (heightScale > 1 && heightScale < scope.scale.max) {
                scope.scale.value = heightScale;
              }
            }

            if (scope.scale.max < 1) {
              scope.scale.value = 1;
              scope.scale.max = 1;
            }

            console.log('scope.bounds.x', scope.bounds.x);
            console.log('scope.bounds.y', scope.bounds.y);
            console.log('scale', scope.scale.value);

            setCurrentScale(scope.scale.value);
            centerImage('x');
            centerImage('y');
            draw();
          };

          img.src = dataURL;
        });
      });

      function centerImage(coord) {
        var property = coord === 'x' ? 'width' : 'height';
        var difference = img[property] / scope.scale.value - canvas[property];

        console.log(property + 'Difference', difference);
        console.log('scale value', scope.scale.value);
        scope.bounds[coord] = difference * scope.scale.value / 2;
        console.log(coord, scope.bounds[coord]);

        if (coord === 'x') {
          sx = scope.bounds[coord];
        } else {
          sy = scope.bounds[coord];
        }
      }

      var sx, sy;
      var move = function move(newX, newY) {
        scope.bounds.x += (sx - newX) * scope.scale.value;
        scope.bounds.y += (sy - newY) * scope.scale.value;

        console.log('scale', scope.scale.value);
        console.log('scope.bounds.x', scope.bounds.x);
        console.log('scope.bounds.y', scope.bounds.y);

        repositionsWithinBounds('x');
        repositionsWithinBounds('y');

        draw();

        sx = newX;
        sy = newY;
      };

      function repositionsWithinBounds(coord) {
        var property = coord === 'x' ? 'width' : 'height';
        var scaledDimension = canvas[property] * scope.scale.value;
        var difference = img[property] - scaledDimension;

        if (difference > 0) {
          if (scope.bounds[coord] > difference + buffer) {
            scope.bounds[coord] = difference + buffer;
          } else if (scope.bounds[coord] < -buffer) {
            scope.bounds[coord] = -buffer;
          }

          if (scope.bounds[coord] < 0) {
            scope.bounds['offset' + coord.toUpperCase()] = -scope.bounds[coord];
          } else if (scope.bounds[coord] > difference) {
            scope.bounds['offset' + coord.toUpperCase()] = -(scope.bounds[coord] - difference);
          } else {
            scope.bounds['offset' + coord.toUpperCase()] = 0;
          }
        } else {
          if (scope.bounds[coord] > 0) {
            scope.bounds[coord] = 0;
          } else if (scope.bounds[coord] < difference) {
            scope.bounds[coord] = difference;
          }

          if (scope.bounds[coord] > 0) {
            scope.bounds['offset' + coord.toUpperCase()] = -scope.bounds[coord];
          } else if (scope.bounds[coord] < difference) {
            scope.bounds['offset' + coord.toUpperCase()] = -(scope.bounds[coord] - difference);
          } else {
            scope.bounds['offset' + coord.toUpperCase()] = 0;
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

        var newD = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

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

      var start = function (x, y) {
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


angular.module("tw.directives.cropper", []).run(["$templateCache", function ($templateCache) {
  $templateCache.put("template/cropper.html", '<div class="cropper-wrapper">' +
    '<canvas width="{{::bounds.width}}" height="{{::bounds.height}}"></canvas>' +
    '<div class="cropper-input-wrapper" ng-if="scale.max > 1">' +
    '<button type="button" class="cropper-zoom-out" ng-click="zoom(.1)">-</button><input type="range" min="0" max="100" step="1" ng-model="scale.percentage" ng-change="onZoom()"/><button type="button" class="cropper-zoom-in" ng-click="zoom(-.1)">+</button>' +
    '</div>' +
    '</div>');
}]);