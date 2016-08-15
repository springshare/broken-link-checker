"use strict";
const server        = require("./server");
const testGenerator = require("./testGenerator");

const chai = require("chai");
chai.config.includeStack = true;
chai.use( require("chai-like") );  // TODO :: currently must be before chai-as-promised: https://github.com/zation/chai-like/issues/5
chai.use( require("chai-as-promised") );
chai.use( require("chai-things") );



module.exports = 
{
	a_an:       testGenerator.a_an,
	addSlashes: testGenerator.addSlashes,
	format:     testGenerator.format,
	//italic:     testGenerator.italic,
	
	options:    require("./options"),
	
	startDeadServer:  server.startDead,
	startDeadServers: server.startDead,
	startServer:      server.start,
	startServers:     server.start,
	stopServers:      server.stop,
	
	tagsString: require("./tagsString"),
	
	fixture: require("./fixture")
};
