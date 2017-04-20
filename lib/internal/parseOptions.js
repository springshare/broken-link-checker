"use strict";
const defaultOptions = require("./defaultOptions");



/*
	Convert an Array to a boolean-value Map.
	
	["asdf1","asdf2"]
	
	to
	
	{ asdf1:true, asdf2:true }
*/
function array2booleanMap(array)
{
	if (Array.isArray(array))
	{
		const map = {};
		const numElements = array.length;
		
		for (let i=0; i<numElements; i++)
		{
			map[ array[i].toLowerCase() ] = true;
		}
		
		return map;
	}
	
	// Unknown input -- return
	return array;
}



function parseOptions(options)
{
	if (options==null || options.__parsed!==true)
	{
		options = Object.assign({}, defaultOptions, options);
		
		// Maps have better search performance, but are not friendly for options
		options.acceptedSchemes = array2booleanMap(options.acceptedSchemes);
		options.excludedSchemes = array2booleanMap(options.excludedSchemes);
		
		options.requestMethod = options.requestMethod.toLowerCase();
		
		// Undocumented -- avoids reparsing pass-thru options from class to class
		options.__parsed = true;
	}
	
	return options;
}



module.exports = parseOptions;
