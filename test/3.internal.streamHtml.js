"use strict";
const helpers    = require("./helpers");
const messages   = require("../lib/internal/messages");
const streamHtml = require("../lib/internal/streamHtml");

const {after, before, describe, it} = require("mocha");
const {expect} = require("chai");
const isStream = require("is-stream");
const {URL} = require("isomorphic-url");
const URLCache = require("urlcache");



describe("INTERNAL -- streamHtml", function()
{
	before(() => helpers.startServer("http://blc/"));
	after(helpers.stopServers);
	
	
	
	it("works", function()
	{
		return streamHtml(
			new URL("http://blc/normal/no-links.html"),
			{},
			null,
			helpers.options()
		)
		.then( function(result)
		{
			expect( isStream(result.stream) ).to.be.true;
			expect(result.response.url.href).to.equal("http://blc/normal/no-links.html");
		});
	});
	
	
	
	it("reports a redirect", function()
	{
		return streamHtml(
			new URL("http://blc/redirect/redirect.html"),
			{},
			null,
			helpers.options()
		)
		.then( function(result)
		{
			expect( isStream(result.stream) ).to.be.true;
			expect(result.response.url.href).to.equal("http://blc/redirect/redirected.html");
		});
	});
	
	
	
	it("rejects a non-html url (gif)", function()
	{
		let accepted = false;
		
		return streamHtml(
			new URL("http://blc/non-html/image.gif"),
			{},
			null,
			helpers.options()
		)
		.then( function(result)
		{
			accepted = new Error("this should not have been called");
		})
		.catch( function(error)
		{
			expect(error).to.be.an.instanceOf(Error);
			expect(error.message).to.equal( messages.errors.EXPECTED_HTML("image/gif") );
		})
		.then( function()
		{
			if (accepted!==false) throw accepted;
		});
	});
	
	
	
	it("rejects a non-html url (unknown)", function()
	{
		let accepted = false;
		
		return streamHtml(
			new URL("http://blc/non-html/empty"),
			{},
			null,
			helpers.options()
		)
		.then( function(result)
		{
			accepted = new Error("this should not have been called");
		})
		.catch( function(error)
		{
			expect(error).to.be.an.instanceOf(Error);
			expect(error.message).to.equal( messages.errors.EXPECTED_HTML(undefined) );
		})
		.then( function()
		{
			if (accepted!==false) throw accepted;
		});
	});
	
	
	
	it("rejects a 404", function()
	{
		let accepted = false;
		
		return streamHtml(
			new URL("http://blc/normal/fake.html"),
			{},
			null,
			helpers.options()
		)
		.then( function(result)
		{
			accepted = new Error("this should not have been called");
		})
		.catch( function(error)
		{
			expect(error).to.be.an.instanceOf(Error);
			expect(error.message).to.equal( messages.errors.HTML_RETRIEVAL );
		})
		.then( function()
		{
			if (accepted!==false) throw accepted;
		});
	});
	
	
	
	it("rejects an erroneous url", function()
	{
		let accepted = false;
		
		return streamHtml(
			"/normal/fake.html",
			{},
			null,
			helpers.options()
		)
		.then( function(result)
		{
			accepted = new Error("this should not have been called");
		})
		.catch( function(error)
		{
			expect(error).to.be.an.instanceOf(Error);
			expect(error.message).to.equal("Invalid URL");
		})
		.then( function()
		{
			if (accepted!==false) throw accepted;
		});
	});
	
	
	
	// NOTE :: cache is not stored for use in `streamHtml()`, but instead for any wrapping functions
	// As a result, the cached responses are not retrieved and checked to be non-unique
	describe("caching", function()
	{
		it("stores the response", function()
		{
			const cache = new URLCache();
			
			return streamHtml(
				new URL("http://blc/normal/no-links.html"),
				{},
				cache,
				helpers.options({ cacheResponses:true })
			)
			.then(result => cache.get("http://blc/normal/no-links.html"))
			.then(response => expect(response).to.be.an("object"));
		});
		
		
		
		it("stores the response of a redirected url", function()
		{
			const cache = new URLCache();
			
			return streamHtml(
				new URL("http://blc/redirect/redirect.html"),
				{},
				cache,
				helpers.options({ cacheResponses:true })
			)
			.then( function(result)
			{
				return cache.get("http://blc/redirect/redirect.html");
			})
			.then( function(response)
			{
				expect(response).to.be.an("object");
					
				return cache.get("http://blc/redirect/redirected.html");
			})
			.then( function(response)
			{
				expect(response).to.be.an("object");
			});
		});
		
		
		
		it("stores the response of a non-html url", function()
		{
			const cache = new URLCache();
			
			return streamHtml(
				new URL("http://blc/non-html/image.gif"),
				{},
				cache,
				helpers.options({ cacheResponses:true })
			)
			.catch( function(error)
			{
				// "Unsupported type", etc, error
			})
			.then( function(result)
			{
				return cache.get("http://blc/non-html/image.gif");
			})
			.then( function(response)
			{
				expect(response).to.be.an("object");
				expect(response).to.not.be.an.instanceOf(Error);
			});
		});
		
		
		
		it("stores the response of a 404", function()
		{
			const cache = new URLCache();
			
			return streamHtml(
				new URL("http://blc/normal/fake.html"),
				{},
				cache,
				helpers.options({ cacheResponses:true })
			)
			.catch( function(error)
			{
				// "HTML not retrieved", etc, error
			})
			.then( function(result)
			{
				return cache.get("http://blc/normal/fake.html");
			})
			.then( function(response)
			{
				expect(response).to.be.an("object");
				expect(response).to.not.be.an.instanceOf(Error);
			});
		});
		
		
		
		it.skip("stores the error from an erroneous url", function()
		{
			const cache = new URLCache();
			
			return streamHtml(
				"/normal/fake.html",
				{},
				cache,
				helpers.options({ cacheResponses:true })
			)
			.catch( function(error)
			{
				// "Invalid URL", etc, error
			})
			.then( function(result)
			{
				return cache.get("/normal/fake.html");
			})
			.then( function(response)
			{
				expect(response).to.be.an.instanceOf(Error);
				expect(response.message).to.equal("Invalid URL");
			});
		});
	});
});
