(function() {

function EnvelopeEditor() {
	EventEmitter.call(this)

	this._data = [ [0, 0.5], [1, 0.5] ]
	this._width = 300
	this._height = 150

	this._id = Math.floor(Math.random() * 10000)

	this._dataToPoints()
}

EnvelopeEditor.prototype = Object.create(EventEmitter.prototype)

EnvelopeEditor.prototype._dataToPoints = function() {
	this._points = this._data.map(function(point) {
		return [
			Math.floor(point[0] * this._width),
			this._height - Math.floor(point[1] * this._height)
		]
	}.bind(this))
}

EnvelopeEditor.prototype._pointsToData = function() {
	this._data = this._points.map(function(point) {
		return [
			point[0] / this._width,
			(this._height - point[1]) / this._height
		]
	}.bind(this))
}

EnvelopeEditor.prototype.data = function(d) {
	this._data = d
	this._dataToPoints()
	return this
}

EnvelopeEditor.prototype.onChanged = function() {
	this._pointsToData()
	this.emit('changed', this._data)
}

EnvelopeEditor.prototype.render = function($out) {
	var that = this
	var width = this._width, height = this._height
	var points = this._points
	var dragged = null,
		selected = points[0]
	var valueAtMouseDown

	var line = d3.svg.line()

	var svg = d3.select($out[0]).append('svg')
		.attr('width', width)
		.attr('height', height)
		.attr('tabindex', 1)

	svg.append('rect')
		.attr('width', width)
		.attr('height', height)
		.on('mousedown', mousedown)

	var $path = svg.append('path')

	function drawLine() {
		$path
			.datum(points)
			.attr('class', 'line')
			.call(redraw)

		if (svg.node().focus)
			svg.node().focus()
	}

	drawLine()

	function redraw() {
		svg.select('path').attr('d', line)

		var circle = svg.selectAll("circle")
		.data(points, function(d, i) {
			return d;
		});

		circle.enter().append("circle")
		.attr("r", 1e-6)
		.on('mousedown', function(d) {
			trackMouseMovement()
			selected = dragged = d
			redraw()
		})
		.transition()
		.duration(750)
		.ease("elastic")
		.attr("r", 6.5);

		circle
		.classed("selected", function(d) {
			return d === selected;
		})
		.attr("cx", function(d) { return d[0]; })
		.attr("cy", function(d) { return d[1]; });

		circle.exit().remove();

		if (d3.event) {
			d3.event.preventDefault();
			d3.event.stopPropagation();
		}

		that.onChanged()
	}

	function trackMouseMovement() {
		valueAtMouseDown = points.slice()
		d3.select(window)
			.on('mousemove.'+that._id, mousemove)
			.on('mouseup.'+that._id, mouseup)
	}

	function mousedown() {
		trackMouseMovement()
		var x = d3.mouse(svg.node())[0]
		var prevCircle

		points.forEach(function(cxy, i) {
			if (cxy[0] < x)
				prevCircle = i
		})

		points.splice(prevCircle+1, 0, dragged = d3.mouse(svg.node()))

		redraw()
	}

	function allowed(direction) {
		var x = dragged[0]
		var ci = points.indexOf(dragged)
		var limit = 0

		if (ci === 0 || ci === (points.length- 1 ))
			return false

		if (direction > 0)
			limit = width

		if (points[ci + direction])
			limit = points[ci + direction][0]

		return (direction === 1 && x < limit)
			|| (direction === -1 && x > limit)
	}

	function sign(i) {
		return i > 0 ? 1 : - 1
	}

	function mousemove() {
		if (!dragged)
			return

		selected = null

		var m = d3.mouse(svg.node())

		var direction = sign(m[0] - dragged[0])

		if (direction !== 0 && !allowed(direction))
			m[0] = dragged[0]

		dragged[0] = Math.max(0, Math.min(width, m[0]))
		dragged[1] = Math.max(0, Math.min(height, m[1]))

		redraw()
	}

	function mouseup() {
		d3.select(window)
			.on('mousemove.'+that._id, null)
			.on('mouseup.'+that._id, null)

		if (!dragged)
			return

		mousemove()

		E2.app.undoManager.execute(
			new E2.commands.Undoable(
				valueAtMouseDown,
				points.slice(),
				function(v) {
					that._points = points = v.slice()
					that.onChanged()
					drawLine()
				},
				'Edit Envelope'
			)
		)

		dragged = selected = null
	}

	return this
}

E2.EnvelopeEditor = EnvelopeEditor

})()