"use strict";

var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var o_path = null;
var frame = 0;
var data = null;
var w = 0, h = 0;

function lpad(n, width)
{
	n += '';
	
	return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
}

function FrameDumpServer(project)
{
	o_path = path.join(project, 'output');
	
	if(!fs.existsSync(o_path))
	    fs.mkdirSync(o_path);
}

FrameDumpServer.prototype.listen = function(expressApp)
{
	expressApp
	.get('/fd/reset', function(req, res)
	{
		var mask = path.join(o_path, '*.tga');
		
		console.log('Reset: ' + mask);
		frame = 0;
		
		exec('rm -f ' + mask, function()
		{
			exec('mkdir -p ' + o_path);
			res.send(200);
		})
	})
	.post('/fd/frame', function(req, res)
	{
		if(!req.query.width || !req.query.height)
		{
			console.error('The client did not specify a width or height');
			return res.send(400);
		}

		if(!data || w !== req.query.width || h !== req.query.height)
		{
			w = req.query.width;
			h = req.query.height;
			data = new Buffer(18 + (req.query.width * req.query.height * 3));
			data[0] = 0; // ID
			data[1] = 0; // No colormap
			data[2] = 2; // Uncompressed true-color image
			data[3] = data[4] = data[5] = data[6] = data[7] = 0;
			data[8] = data[9] = 0; // X origin
			data[10] = data[11] = 0; // Y origin
			data[12] = (w & 255)
			data[13] = (w >> 8) & 255; // Width
			data[14] = (h & 255)
			data[15] = (h >> 8) & 255; // Height
			data[16] = 24; // BPP
			data[17] = 0; // No alpha
		}

		var offset = 18;
		var filename = path.join(o_path, lpad(frame++, 8) + '.tga');

		req.on('data', function(d)
		{
			d.copy(data, offset);
			offset += d.length;
		});

		req.on('end', function()
		{
			fs.writeFileSync(filename, data);
			console.log('Wrote frame: ' + filename);
			res.send(200);
		});
	});
}

exports.FrameDumpServer = FrameDumpServer;
