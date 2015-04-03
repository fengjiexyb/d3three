var chartOffset = -0;

// Override default functions for d3
THREE.Object3D.prototype.appendChild = function (c) {
  this.add(c);
  return c;
};
THREE.Object3D.prototype.querySelectorAll = function () { return []; };

// this one is to use D3's .attr() on THREE's objects
THREE.Object3D.prototype.setAttribute = function (name, value) {
    var chain = name.split('.');
    var object = this;
    for (var i = 0; i < chain.length - 1; i++) {
        object = object[chain[i]];
    }
    object[chain[chain.length - 1]] = value;
}

var d3threes = [];

// d3three object
D3THREE = function(singleton) {
  this.labelGroup = new THREE.Object3D();
  this.maxY = 0;
  this.axisObjects = {};
  
  if (!singleton) {
    d3threes.push(this);
  }
}

D3THREE.prototype.init = function(divId) {
  // standard THREE stuff, straight from examples
  this.renderer = new THREE.WebGLRenderer({antialias: true, alpha : true});
  this.renderer.shadowMapEnabled = true;
  this.renderer.shadowMapType = THREE.PCFSoftShadow;
  this.renderer.shadowMapSoft = true;
  this.renderer.shadowCameraNear = 1000;
  this.renderer.shadowCameraFar = 10000;
  this.renderer.shadowCameraFov = 50;
  this.renderer.shadowMapBias = 0.0039;
  this.renderer.shadowMapDarkness = 0.25;
  this.renderer.shadowMapWidth = 10000;
  this.renderer.shadowMapHeight = 10000;
  this.renderer.physicallyBasedShading = true;
  
  this.divId = divId;
  this.width = document.getElementById(divId).offsetWidth;
  this.height = document.getElementById(divId).offsetHeight;
  
  this.renderer.setSize( this.width, this.height );
  
  document.getElementById(divId).appendChild( this.renderer.domElement );

  this.camera = new THREE.PerspectiveCamera( 30, this.width / this.height, 1, 100000 );
  this.camera.position.z = -1000;
  this.camera.position.x = -800;
  this.camera.position.y = 600;

  this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );

  this.scene = new THREE.Scene();

  var light = new THREE.AmbientLight( 0xbbbbb ); // soft white light
  this.scene.add( light );
    
  this.scene.add(this.labelGroup);

  var self = this;
  var onWindowResize = function() {
    self.camera.aspect = self.width / self.height;
    self.camera.updateProjectionMatrix();

    self.renderer.setSize( self.width, self.height );
  }
  
  window.addEventListener( 'resize', onWindowResize, false );
}

D3THREE.prototype.animate = function() {
  requestAnimationFrame( d3three.animate );
  
  for (var i = 0; i < d3threes.length; i++) {
    var dt = d3threes[i];
    dt.renderer.render( dt.scene, dt.camera );
    dt.controls.update();
  
    dt.labelGroup.children.forEach(function(l){
      l.rotation.setFromRotationMatrix(dt.camera.matrix, "YXZ");
      l.rotation.x = 0;
      l.rotation.z = 0;
    });
  }
}

D3THREE.prototype.render = function(element, data) {
  element.render(data);
}

d3three = new D3THREE(true);

// d3three axis
D3THREE.Axis = function(dt) {
  this._scale = d3.scale.linear();
  this._orient = "x";
  this._tickFormat = function(d) { return d };
  this._dt = dt;
}

D3THREE.Axis.prototype.orient = function(o) {
  if (o) {
    this._dt.axisObjects[o] = this;
    this._orient = o;
  }
  return this;
}

D3THREE.Axis.prototype.scale = function(s) {
  if (s) {
    this._scale = s;
  }
  return this;
}

D3THREE.Axis.prototype.tickFormat = function(f) {
  if (f) {
    this._tickFormat = f;
  }
  return this;
}

D3THREE.Axis.prototype.interval = function() {
  var interval;
  if (typeof(this._scale.rangeBand) === 'function') {
    // ordinal scale
    interval = this._scale.range()[1];
  } else {
    interval = this._scale.range()[1] / (this._scale.ticks().length - 1);
  }
  return interval;
}

D3THREE.Axis.prototype.ticks = function() {
  var ticks;
  if (typeof(this._scale.rangeBand) === 'function') {
    // ordinal scale
    ticks = this._scale.domain();
  } else {
    ticks = this._scale.ticks();
  }
  return ticks;
}

D3THREE.Axis.prototype.getRotationShift = function() {
  return this.interval() * (this.ticks().length - 1) / 2;
}

D3THREE.Axis.prototype.render = function() {
  var material = new THREE.LineBasicMaterial({
    color: 0xbbbbbb,
    linewidth: 2
  });
  
  var tickMaterial = new THREE.LineBasicMaterial({
    color: 0xbbbbbb,
    linewidth: 1
  });
  
  var geometry = new THREE.Geometry();
  
  interval = this.interval();
  
  var interval = this.interval(), ticks = this.ticks();
  
  // x,y axis shift, so rotation is from center of screen
  var xAxisShift = this._dt.axisObjects.x.getRotationShift(),
      yAxisShift = this._dt.axisObjects.y.getRotationShift();
  
  for (var i = 0; i < ticks.length; i++) {
    var tickMarGeometry = new THREE.Geometry();
    
    var shape = new THREE.TextGeometry(this._tickFormat(ticks[i]),
      {
        size: 5,
        height: 1,
        curveSegments: 20
      });
    var wrapper = new THREE.MeshBasicMaterial({color: 0xbbbbbb});
    var words = new THREE.Mesh(shape, wrapper);
    
    if (this._orient === "y") {
      // tick
      geometry.vertices.push(new THREE.Vector3(i * interval - yAxisShift, chartOffset, 0 - xAxisShift));
      
      tickMarGeometry.vertices.push(new THREE.Vector3(i * interval - yAxisShift, chartOffset, 0 - xAxisShift));
      tickMarGeometry.vertices.push(new THREE.Vector3(i * interval - yAxisShift, -10 + chartOffset, 0 - xAxisShift));
      var tickLine = new THREE.Line(tickMarGeometry, tickMaterial);
      this._dt.scene.add(tickLine);
      
      if (i * interval > this._dt.maxY) {
        this._dt.maxY = i * interval;
      }
      
      words.position.set(i * interval - yAxisShift, -20 + chartOffset, 0 - xAxisShift);
    } else if (this._orient === "z") {
      // tick
      geometry.vertices.push(new THREE.Vector3(0 + this._dt.maxY - yAxisShift, i * interval + chartOffset, 0 - xAxisShift));

      tickMarGeometry.vertices.push(new THREE.Vector3(0 + this._dt.maxY - yAxisShift, i * interval + chartOffset, 0 - xAxisShift));
      tickMarGeometry.vertices.push(new THREE.Vector3(10 + this._dt.maxY - yAxisShift, i * interval + chartOffset, 0 - xAxisShift));
      var tickLine = new THREE.Line(tickMarGeometry, tickMaterial);
      this._dt.scene.add(tickLine);
      
      words.position.set(20 + this._dt.maxY - yAxisShift, i * interval + chartOffset, 0 - xAxisShift);
    } else if (this._orient === "x") {
      // tick
      geometry.vertices.push(new THREE.Vector3(0 - yAxisShift, chartOffset, i * interval - xAxisShift));
      
      tickMarGeometry.vertices.push(new THREE.Vector3(0 - yAxisShift, 0 + chartOffset, i * interval - xAxisShift));
      tickMarGeometry.vertices.push(new THREE.Vector3(0 - yAxisShift, -10 + chartOffset, i * interval - xAxisShift));
      var tickLine = new THREE.Line(tickMarGeometry, tickMaterial);
      this._dt.scene.add(tickLine);
      
      words.position.set(0 - yAxisShift, -20 + chartOffset, i * interval - xAxisShift);
    }
    
    this._dt.labelGroup.add(words);
  }
  
  var line = new THREE.Line(geometry, material);
  
  this._dt.scene.add(line);
}

d3three.axis = function(dt) {
  return new D3THREE.Axis(dt);
}

// Chart object
D3THREE.Chart = function() {
}

D3THREE.Chart.prototype.config = function(c) {
  this._config = $.extend(this._config, c);
}

D3THREE.Chart.prototype.init = function(dt) {
  this._dt = dt;
  // mouse move
  var self = this;
  this._dt.renderer.domElement.addEventListener( 'mousemove', function(e) {
    self.onDocumentMouseMove(e);
  }, false );
}

// Scatter plot
D3THREE.Scatter = function(dt) {  
  this.init(dt);
  
  this._nodeGroup = new THREE.Object3D();
  
  this._config = {color: 0x4682B4, pointRadius: 5};
}

D3THREE.Scatter.prototype = new D3THREE.Chart();

D3THREE.Scatter.prototype.onDocumentMouseMove = function(e) {
  // detect intersected spheres
  var vector = new THREE.Vector3();
  vector.x = ( (e.clientX - this._dt.renderer.domElement.offsetLeft) / this._dt.renderer.domElement.width ) * 2 - 1;
  vector.y = 1 - ( (e.clientY - this._dt.renderer.domElement.offsetTop) / this._dt.renderer.domElement.height ) * 2;
  vector.z = 1;
  
  // create a check ray
	vector.unproject( this._dt.camera );
  var ray = new THREE.Raycaster( this._dt.camera.position,
    vector.sub( this._dt.camera.position ).normalize() );
  
  var intersects = ray.intersectObjects( this._nodeGroup.children );
  
  for (var i = 0; i < this._nodeGroup.children.length; i++) {
    this._nodeGroup.children[i].material.opacity = 1;
  }
  
  if (intersects.length > 0) {
    var obj = intersects[0].object;
    obj.material.opacity = 0.5;
    
    var html = "";

    html += "<div class=\"tooltip_kv\">";
    html += "<span>";
    html += "x: " + this._dt.axisObjects.x._tickFormat(obj.userData.x);
    html += "</span><br>";
    html += "<span>";
    html += "y: " + this._dt.axisObjects.y._tickFormat(obj.userData.y);
    html += "</span><br>";
    html += "<span>";
    html += "z: " + this._dt.axisObjects.z._tickFormat(obj.userData.z);
    html += "</span><br>";
    html += "</div>";

    document.getElementById("tooltip-container").innerHTML = html;
    document.getElementById("tooltip-container").style.display = "block";

    document.getElementById("tooltip-container").style.top = (e.clientY + 10) + "px";
    document.getElementById("tooltip-container").style.left = (e.clientX + 10) + "px";
  } else {
    document.getElementById("tooltip-container").style.display = "none";
  }
}

D3THREE.Scatter.prototype.render = function(data) {
  var geometry = new THREE.SphereGeometry( this._config.pointRadius, 32, 32 );

  this._dt.scene.add(this._nodeGroup);
  
  // x,y axis shift, so rotation is from center of screen
  var xAxisShift = this._dt.axisObjects.x.getRotationShift(),
    yAxisShift = this._dt.axisObjects.y.getRotationShift();
  
  var self = this;
  d3.select(this._nodeGroup)
        .selectAll()
        .data(data)
    .enter().append( function(d) {
      var material = new THREE.MeshBasicMaterial( {
        color: self._config.color } );
      var mesh = new THREE.Mesh( geometry, material );
      mesh.userData = {x: d.x, y: d.y, z: d.z};
      return mesh;
    } )
        .attr("position.z", function(d) {
          return self._dt.axisObjects.x._scale(d.x) - xAxisShift;
        })
        .attr("position.x", function(d) {
          return self._dt.axisObjects.y._scale(d.y) - yAxisShift;
        })
        .attr("position.y", function(d) {
          return self._dt.axisObjects.z._scale(d.z) + chartOffset;
        });
}

// Surface plot
D3THREE.Surface = function(dt) {  
  this.init(dt);
  
  this._nodeGroup = new THREE.Object3D();
  
  this._config = {color: 0x4682B4, pointColor: 0xff7f0e, pointRadius: 2};
}

D3THREE.Surface.prototype = new D3THREE.Chart();

D3THREE.Surface.prototype.onDocumentMouseMove = function(e) {
  // detect intersected spheres
  var vector = new THREE.Vector3();
  vector.x = ( (e.clientX - this._dt.renderer.domElement.offsetLeft) / this._dt.renderer.domElement.width ) * 2 - 1;
  vector.y = 1 - ( (e.clientY - this._dt.renderer.domElement.offsetTop) / this._dt.renderer.domElement.height ) * 2;
  vector.z = 1;
  
  // create a check ray
	vector.unproject( this._dt.camera );
  var ray = new THREE.Raycaster( this._dt.camera.position,
    vector.sub( this._dt.camera.position ).normalize() );
  
  var meshIntersects = ray.intersectObjects( [this._meshSurface] );
  
  if (meshIntersects.length > 0) {
    for (var i = 0; i < this._nodeGroup.children.length; i++) {
      this._nodeGroup.children[i].visible = true;
      this._nodeGroup.children[i].material.opacity = 1;
    }
    
    var intersects = ray.intersectObjects( this._nodeGroup.children );
    
    if (intersects.length > 0) {
      var obj = intersects[0].object;
      obj.material.opacity = 0.5;
    
      var html = "";

      html += "<div class=\"tooltip_kv\">";
      html += "<span>";
      html += "x: " + this._dt.axisObjects.x._tickFormat(obj.userData.x);
      html += "</span><br>";
      html += "<span>";
      html += "y: " + this._dt.axisObjects.y._tickFormat(obj.userData.y);
      html += "</span><br>";
      html += "<span>";
      html += "z: " + this._dt.axisObjects.z._tickFormat(obj.userData.z);
      html += "</span><br>";
      html += "</div>";

      document.getElementById("tooltip-container").innerHTML = html;
      document.getElementById("tooltip-container").style.display = "block";

      document.getElementById("tooltip-container").style.top = (e.clientY + 10) + "px";
      document.getElementById("tooltip-container").style.left = (e.clientX + 10) + "px";
    } else {
      document.getElementById("tooltip-container").style.display = "none";
    }
  } else {
    // hide nodes
    for (var i = 0; i < this._nodeGroup.children.length; i++) {
      this._nodeGroup.children[i].visible = false;
    }
  }
}

D3THREE.Surface.prototype.render = function(threeData) {
  /* render data points */
  var geometry = new THREE.SphereGeometry( this._config.pointRadius, 32, 32 );

  this._dt.scene.add(this._nodeGroup);
  
  // x,y axis shift, so rotation is from center of screen
  var xAxisShift = this._dt.axisObjects.x.getRotationShift(),
      yAxisShift = this._dt.axisObjects.y.getRotationShift();
  
  var self = this;
  d3.select(this._nodeGroup)
        .selectAll()
        .data(threeData)
    .enter().append( function(d) {
      var material = new THREE.MeshBasicMaterial( {
        color: self._config.pointColor } );
      var mesh = new THREE.Mesh( geometry, material );
      mesh.userData = {x: d.x, y: d.y, z: d.z};
      mesh.visible = false;
      return mesh;
    } )
        .attr("position.z", function(d) {
          return self._dt.axisObjects.x._scale(d.x) - xAxisShift;
        })
        .attr("position.x", function(d) {
          return self._dt.axisObjects.y._scale(d.y) - yAxisShift;
        })
        .attr("position.y", function(d) {
          return self._dt.axisObjects.z._scale(d.z) + chartOffset;
        });
  
  /* custom surface */
  function distance (v1, v2)
  {
    var dx = v1.x - v2.x;
    var dy = v1.y - v2.y;
    var dz = v1.z - v2.z;

    return Math.sqrt(dx*dx+dz*dz);
  }

  var vertices = [];
  var holes = [];
  var triangles, mesh;
  var geometry = new THREE.Geometry();
  var material = new THREE.MeshBasicMaterial({color: this._config.color});

  for (var i = 0; i < threeData.length; i++) {
    vertices.push(new THREE.Vector3(
      self._dt.axisObjects.y._scale(threeData[i].y) - yAxisShift,
      self._dt.axisObjects.z._scale(threeData[i].z) + chartOffset,
      self._dt.axisObjects.x._scale(threeData[i].x) - xAxisShift));
  }

  geometry.vertices = vertices;

  for (var i = 0; i < vertices.length; i++) {
    // find three closest vertices to generate surface
    var v1, v2, v3;
    var distances = [];
  
    // find vertices in same y or y + 1 row
    var minY = Number.MAX_VALUE;
    for (var j = i + 1; j < vertices.length; j++) {
      if (i !== j && vertices[j].x > vertices[i].x) {
        if (vertices[j].x < minY) {
          minY = vertices[j].x;
        }
      }
    }
  
    var rowVertices = [], row2Vertices = [];
    for (var j = i + 1; j < vertices.length; j++) {
      if (i !== j && (vertices[j].x === vertices[i].x)) {
        rowVertices.push({index: j, v: vertices[j]});
      }
      if (i !== j && (vertices[j].x === minY)) {
        row2Vertices.push({index: j, v: vertices[j]});
      }
    }
  
    if (rowVertices.length >= 1 && row2Vertices.length >= 2) {
      // find smallest x
      rowVertices.sort(function(a, b) {
        if (a.v.z < b.v.z) {
          return -1;
        } else if (a.v.z === b.v.z) {
          return 0;
        } else {
          return 1;
        }
      });
    
      v1 = rowVertices[0].index;
    
      row2Vertices.sort(function(a, b) {
        if (a.v.z < b.v.z) {
          return -1;
        } else if (a.v.z === b.v.z) {
          return 0;
        } else {
          return 1;
        }
      });
    
      v2 = row2Vertices[0].index;
      v3 = row2Vertices[1].index;
    
      var fv = [i, v1, v2, v3];
      fv = fv.sort(function(a, b) {
        if (a < b) return -1;
        else if (a === b) return 0;
        else return 1;
      });
    
      geometry.faces.push( new THREE.Face3(fv[1], fv[0], fv[3]));
      geometry.faces.push( new THREE.Face3(fv[0], fv[2], fv[3]));
    }
  }

  this._meshSurface = new THREE.Mesh( geometry, material );
  this._dt.scene.add(this._meshSurface);
}