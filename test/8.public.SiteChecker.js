"use strict";
const helpers     = require("./helpers");
const messages    = require("../lib/internal/messages");
const SiteChecker = require("../lib/public/SiteChecker");

const {after, before, describe, it} = require("mocha");
const {expect} = require("chai");



function maybeAddContainers(results, pageIndex, siteIndex)
{
	if (siteIndex != null)
	{
		if (results[siteIndex] === undefined)
		{
			results[siteIndex] = [];
		}
		
		if (results[siteIndex][pageIndex] === undefined)
		{
			results[siteIndex][pageIndex] = [];
		}
	}
	else if (results[pageIndex] === undefined)
	{
		results[pageIndex] = [];
	}
}



// TODO :: https://github.com/mochajs/mocha/issues/1128#issuecomment-246186839
describe("PUBLIC -- SiteChecker", function()
{
	before(() => helpers.startServers("http://blc/", "http://blc:81/"));  // second server for external redirects
	after(helpers.stopServers);
	
	
	
	describe("methods (#1)", function()
	{
		describe("enqueue()", function()
		{
			it("accepts a valid url", function()
			{
				const id = new SiteChecker( helpers.options() ).enqueue("http://blc/");
				
				expect(id).to.be.a("number");
			});
			
			
			
			it("rejects an invalid url", function()
			{
				expect(() => new SiteChecker( helpers.options() ).enqueue("/path/")).to.throw(TypeError);
			});
		});
	});
	
	
	
	// TODO :: find a way to test "robots" without requiring the use of an option
	describe("events", function()
	{
		it("html", function(done)
		{
			let count = 0;
			
			new SiteChecker( helpers.options() )
			.on("html", function(tree, robots, response, pageUrl, customData)
			{
				// HTML has more than one link/page, so only accept the first
				// to avoid calling `done()` more than once
				if (++count > 1) return;
				
				expect(tree).to.be.an.instanceOf(Object);
				expect(response).to.be.an.instanceOf(Object);
				expect(pageUrl).to.be.an.instanceOf(Object);
				expect(customData).to.be.a("number");
				done();
			})
			.enqueue("http://blc/normal/index.html", 123);
		});
		
		
		
		it("link", function(done)
		{
			let count = 0;
			
			new SiteChecker( helpers.options() )
			.on("link", function(result, customData)
			{
				// HTML has more than one link, so only accept the first
				// to avoid calling `done()` more than once
				if (++count > 1) return;
				
				expect(arguments).to.have.length(2);
				expect(result).to.be.an.instanceOf(Object);
				expect(customData).to.be.a("number");
				done();
			})
			.enqueue("http://blc/normal/index.html", 123);
		});
		
		
		
		it("page", function(done)
		{
			let count = 0;
			
			new SiteChecker( helpers.options() )
			.on("page", function(error, pageUrl, customData)
			{
				// Site has more than one page, so only accept the first
				// to avoid calling `done()` more than once
				if (++count > 1) return;
				
				expect(arguments).to.have.length(3);
				expect(error).to.be.null;
				expect(pageUrl).to.be.an.instanceOf(Object);
				expect(customData).to.be.a("number");
				done();
			})
			.enqueue("http://blc/normal/index.html", 123);
		});
		
		
		
		it("site", function(done)
		{
			new SiteChecker( helpers.options() )
			.on("site", function(error, siteUrl, customData)
			{
				expect(arguments).to.have.length(3);
				expect(error).to.be.null;
				expect(siteUrl).to.be.an.instanceOf(Object);
				expect(customData).to.be.a("number");
				done();
			})
			.enqueue("http://blc/normal/index.html", 123);
		});
		
		
		
		it("end", function(done)
		{
			new SiteChecker( helpers.options() )
			.on("end", function()
			{
				expect(arguments).to.be.empty;
				done();
			})
			.enqueue("http://blc/normal/index.html");
		});
	});
	
	
	
	describe("methods (#2)", function()
	{
		describe("numActiveLinks()", function()
		{
			it("works", function(done)
			{
				let htmlCalled = false;
				
				const instance = new SiteChecker( helpers.options() )
				.on("html", function()
				{
					if (htmlCalled) return;  // skip recursive checks
					
					// Give time for link checks to start
					setImmediate( function()
					{
						expect( instance.numActiveLinks() ).to.equal(2);
						htmlCalled = true;
					});
				})
				.on("end", function()
				{
					expect(htmlCalled).to.be.true;
					expect( instance.numActiveLinks() ).to.equal(0);
					done();
				});
				
				instance.enqueue("http://blc/normal/index.html");
				
				expect( instance.numActiveLinks() ).to.equal(0);
			});
		});
		
		
		
		describe("pause() / resume()", function()
		{
			it("works", function(done)
			{
				let resumed = false;
				
				const instance = new SiteChecker( helpers.options() )
				.on("end", function()
				{
					expect(resumed).to.be.true;
					done();
				});
				
				instance.pause();
				
				instance.enqueue("http://blc/");
				
				// Wait longer than scan should take
				setTimeout( function()
				{
					resumed = true;
					instance.resume();
					
				}, 100);
			});
		});
		
		
		
		// TODO :: test what happens when the current queue item is dequeued
		describe("dequeue() / numSites() / numPages() / numQueuedLinks()", function()
		{
			it("accepts a valid id", function(done)
			{
				const instance = new SiteChecker( helpers.options() )
				.on("end", function()
				{
					expect( instance.numSites() ).to.equal(0);
					expect( instance.numPages() ).to.equal(0);
					expect( instance.numQueuedLinks() ).to.equal(0);
					done();
				});
				
				// Prevent first queued item from immediately starting (and thus being auto-dequeued)
				instance.pause();
				
				const id = instance.enqueue("http://blc/normal/index.html");
				
				expect( instance.numSites() ).to.equal(1);
				expect( instance.numPages() ).to.equal(0);
				expect( instance.numQueuedLinks() ).to.equal(0);
				expect( instance.dequeue(id) ).to.be.true;
				expect( instance.numSites() ).to.equal(0);
				expect( instance.numPages() ).to.equal(0);
				expect( instance.numQueuedLinks() ).to.equal(0);
				
				instance.enqueue("http://blc/normal/index.html");
				instance.resume();
				
				// Wait for HTML to be downloaded and parsed
				setImmediate( function()
				{
					expect( instance.numSites() ).to.equal(1);
					expect( instance.numPages() ).to.equal(1);
					expect( instance.numQueuedLinks() ).to.equal(2);
				});
			});
			
			
			
			it("rejects an invalid id", function()
			{
				const instance = new SiteChecker( helpers.options() );
				
				// Prevent first queued item from immediately starting (and thus being auto-dequeued)
				instance.pause();
				
				const id = instance.enqueue("http://blc/");
				
				expect( instance.dequeue(id+1) ).to.be.false;
				expect( instance.numSites() ).to.equal(1);
			});
		});
	});
	
	
	
	describe("edge cases", function()
	{
		it("supports custom data", function(done)
		{
			let linkCalled = false;
			let pageCalled = false;
			let siteCalled = false;
			
			new SiteChecker( helpers.options() )
			.on("link", function(result, customData)
			{
				expect(customData).to.be.an.instanceOf(Object);
				expect(customData.test).to.equal("value");
				linkCalled = true;
			})
			.on("page", function(error, pageUrl, customData)
			{
				expect(customData).to.be.an.instanceOf(Object);
				expect(customData.test).to.equal("value");
				pageCalled = true;
			})
			.on("site", function(error, siteUrl, customData)
			{
				expect(customData).to.be.an.instanceOf(Object);
				expect(customData.test).to.equal("value");
				siteCalled = true;
			})
			.on("end", function()
			{
				expect(linkCalled).to.be.true;
				expect(pageCalled).to.be.true;
				expect(siteCalled).to.be.true;
				done();
			})
			.enqueue("http://blc/normal/index.html", {test:"value"});
		});
		
		
		
		it("supports multiple queue items", function(done)
		{
			let pageIndex = 0;
			const results = [];
			
			const instance = new SiteChecker( helpers.options() )
			.on("link", function(result, customData)
			{
				maybeAddContainers(results, pageIndex, customData.siteIndex);
				
				results[ customData.siteIndex ][pageIndex][ result.html.index ] = result;
			})
			.on("page", function(error, pageUrl, customData)
			{
				expect(error).to.be.null;
				
				// If first page didn't load
				// If first page did load but had no links
				maybeAddContainers(results, pageIndex, customData.siteIndex);
				
				pageIndex++;
			})
			.on("site", function(error, siteUrl, customData)
			{
				expect(error).to.be.null;
				
				pageIndex = 0;
			})
			.on("end", function()
			{
				expect(results).to.have.length(2);
				
				expect(results[0]).to.have.length(3);         // site (with pages checked)
				expect(results[0][0]).to.have.length(2);      // page -- index.html
				expect(results[0][0][0].broken).to.be.false;  // link -- with-links.html
				expect(results[0][0][1].broken).to.be.true;   // link -- fake.html
				expect(results[0][1]).to.have.length(2);      // page -- with-links.html
				expect(results[0][1][0].broken).to.be.false;  // link -- no-links.html
				expect(results[0][1][1].broken).to.be.true;   // link -- fake.html
				expect(results[0][2]).to.have.length(0);      // page -- no-links.html
				
				expect(results[1]).to.have.length(3);         // site (with pages checked)
				expect(results[1][0]).to.have.length(2);      // page -- index.html
				expect(results[1][0][0].broken).to.be.false;  // link -- with-links.html
				expect(results[1][0][1].broken).to.be.true;   // link -- fake.html
				expect(results[1][1]).to.have.length(2);      // page -- with-links.html
				expect(results[1][1][0].broken).to.be.false;  // link -- no-links.html
				expect(results[1][1][1].broken).to.be.true;   // link -- fake.html
				expect(results[1][2]).to.have.length(0);      // page -- no-links.html
				
				done();
			});
			
			instance.enqueue("http://blc/normal/index.html", {siteIndex:0});
			instance.enqueue("http://blc/normal/index.html", {siteIndex:1});
		});
		
		
		
		it("supports html with no links", function(done)
		{
			let linkCount = 0;
			let pageCalled = false;
			let siteCalled = false;
			
			new SiteChecker( helpers.options() )
			.on("link", function()
			{
				linkCount++;
			})
			.on("page", function()
			{
				pageCalled = true;
			})
			.on("site", function()
			{
				siteCalled = true;
			})
			.on("end", function()
			{
				expect(pageCalled).to.be.true;
				expect(siteCalled).to.be.true;
				expect(linkCount).to.equal(0);
				done();
			})
			.enqueue("http://blc/normal/no-links.html");
		});
		
		
		
		it("supports pages after html with no links", function(done)
		{
			let linkCount = 0;
			let pageCount = 0;
			let siteCount = 0;
			
			const instance = new SiteChecker( helpers.options() )
			.on("link", function()
			{
				linkCount++;
			})
			.on("page", function()
			{
				pageCount++;
			})
			.on("site", function()
			{
				siteCount++;
			})
			.on("end", function()
			{
				expect(linkCount).to.equal(4);
				expect(pageCount).to.equal(4);  // no-links.html is checked twice because they're part of two different site queue items
				expect(siteCount).to.equal(2);
				done();
			});

			instance.enqueue("http://blc/normal/no-links.html");
			instance.enqueue("http://blc/normal/index.html");
		});
		
		
		
		it("reports a page+site error when first page's html cannot be retrieved", function(done)
		{
			let pageCalled = false;
			let siteCalled = false;
			
			new SiteChecker( helpers.options() )
			.on("page", function(error, pageUrl, customData)
			{
				expect(error).to.be.an.instanceOf(Error);
				expect(error.message).to.equal( messages.errors.HTML_RETRIEVAL );
				expect(pageUrl).to.be.an.instanceOf(Object);
				pageCalled = true;
			})
			.on("site", function(error, siteUrl, customData)
			{
				expect(error).to.be.an.instanceOf(Error);
				expect(error.message).to.equal( messages.errors.HTML_RETRIEVAL );
				expect(siteUrl).to.be.an.instanceOf(Object);
				siteCalled = true;
			})
			.on("end", function()
			{
				expect(pageCalled).to.be.true;
				expect(siteCalled).to.be.true;
				done();
			})
			.enqueue("http://blc/normal/fake.html");
		});
		
		
		
		it("does not report site error when non-first page's html cannot be retrieved", function(done)
		{
			let pageCount = 0;
			
			new SiteChecker( helpers.options() )
			.on("page", function(error, pageUrl, customData)
			{
				if (++pageCount < 3)
				{
					expect(error).to.not.be.an.instanceOf(Error);
				}
				else
				{
					expect(error).to.be.an.instanceOf(Error);
				}
			})
			.on("site", function(error, siteUrl, customData)
			{
				expect(error).to.not.be.an.instanceOf(Error);
			})
			.on("end", function()
			{
				done();
			})
			.enqueue("http://blc/normal/with-links.html");
		});
		
		
		
		it("supports sites after first page's html could not be retrieved", function(done)
		{
			let pageCount = 0;
			let siteCount = 0;
			
			const instance = new SiteChecker( helpers.options() )
			.on("page", function(error, pageUrl, customData)
			{
				if (++pageCount === 1)
				{
					expect(error).to.be.an.instanceOf(Error);
				}
				else
				{
					expect(error).to.not.be.an.instanceOf(Error);
				}
			})
			.on("site", function(error, siteUrl, customData)
			{
				if (++siteCount === 1)
				{
					expect(error).to.be.an.instanceOf(Error);
				}
				else
				{
					expect(error).to.not.be.an.instanceOf(Error);
				}
			})
			.on("end", function()
			{
				expect(pageCount).to.equal(2);
				expect(siteCount).to.equal(2);
				done();
			});
			
			instance.enqueue("http://blc/normal/fake.html");
			instance.enqueue("http://blc/normal/no-links.html");
		});
		
		
		
		it("does not check a page that has already been checked", function(done)
		{
			let pageCount = 0;
			
			new SiteChecker( helpers.options() )
			.on("page", function()
			{
				pageCount++;
			})
			.on("end", function()
			{
				expect(pageCount).to.equal(3);
				done();
			})
			.enqueue("http://blc/circular/index.html");
		});
		
		
		
		it("does not check a page that redirects to a page that has already been checked", function(done)
		{
			let pageCount = 0;
			
			new SiteChecker( helpers.options() )
			.on("page", function()
			{
				pageCount++;
			})
			.on("end", function()
			{
				expect(pageCount).to.equal(2);
				done();
			})
			.enqueue("http://blc/redirect/index.html");
		});
		
		
		
		it("does not check a page that redirects to a page that has already been checked (#2)", function(done)
		{
			let pageCount = 0;
			
			new SiteChecker( helpers.options() )
			.on("page", function()
			{
				pageCount++;
			})
			.on("end", function()
			{
				expect(pageCount).to.equal(1);
				done();
			})
			.enqueue("http://blc/circular-redirect/redirect.html");
		});
		
		
		
		it("does not check a non-first page that redirects to another site", function(done)
		{
			let linkCount = 0;
			let pageCount = 0;
			
			new SiteChecker( helpers.options() )
			.on("link", function(result, customData)
			{
				expect(result.broken).to.be.false;
				linkCount++;
			})
			.on("page", function()
			{
				pageCount++;
			})
			.on("end", function()
			{
				expect(linkCount).to.equal(1);
				expect(pageCount).to.equal(1);
				done();
			})
			.enqueue("http://blc/external-redirect/index.html");
		});
		
		
		
		it("checks a first page that redirects to another site", function(done)
		{
			let pageCount = 0;
			
			new SiteChecker( helpers.options() )
			.on("page", function(error, pageUrl, customData)
			{
				expect(error).to.not.be.an.instanceOf(Error);
				pageCount++;
			})
			.on("end", function()
			{
				expect(pageCount).to.equal(1);
				done();
			})
			.enqueue("http://blc/external-redirect/redirect.html");
		});
		
		
		
		// TODO :: does not check a non-first page that redirects to another site when options.excludeInternalLinks=true
	});
	
	
	
	describe("options", function()
	{
		it("honorRobotExclusions = false (robots.txt)", function(done)
		{
			const results = [];
			
			new SiteChecker( helpers.options() )
			.on("robots", function(robots)
			{
				done( new Error("this should not have been called") );
			})
			.on("junk", function(result)
			{
				done( new Error("this should not have been called") );
			})
			.on("link", function(result)
			{
				results[result.html.offsetIndex] = result;
			})
			.on("end", function()
			{
				expect(results).to.have.length(1);
				expect(results[0]).to.containSubset(
				{
					broken: false,
					excluded: false,
					excludedReason: null
				});
				done();
			})
			.enqueue("http://blc/disallowed/robots-txt.html");
		});
		
		
		
		// TODO :: remove custom data when separated "robots" even test is created
		it.skip("honorRobotExclusions = true (robots.txt)", function(done)
		{
			const junkResults = [];
			let robotsCalled = true;
			
			new SiteChecker( helpers.options({ honorRobotExclusions:true }) )
			.on("robots", function(robots, customData)
			{
				expect(robots).to.be.an.instanceOf(Object);
				expect(customData).to.be.a("number");
				robotsCalled = true;
			})
			.on("junk", function(result)
			{
				junkResults[result.html.offsetIndex] = result;
			})
			.on("link", function(result)
			{
				done( new Error("this should not have been called") );
			})
			.on("end", function()
			{
				expect(robotsCalled).to.be.true;
				expect(junkResults).to.have.length(1);
				expect(junkResults[0]).to.containSubset(
				{
					broken: null,
					excluded: true,
					excludedReason: "BLC_ROBOTS"
				});
				done();
			})
			.enqueue("http://blc/disallowed/robots-txt.html", 123);
		});
		
		
		
		it.skip("honorRobotExclusions = false (rel + meta + header + robots.txt)", function(done)
		{
			let pageIndex = 0;
			const results = [];
			
			new SiteChecker( helpers.options() )
			.on("robots", function(robots)
			{
				done( new Error("this should not have been called") );
			})
			.on("junk", function(result)
			{
				done( new Error("this should not have been called") );
			})
			.on("link", function(result)
			{
				maybeAddContainers(results, pageIndex);
				
				results[pageIndex][ result.html.index ] = result;
			})
			.on("page", function(error)
			{
				expect(error).to.be.null;
				
				// If first page didn't load
				// If first page did load but had no links
				maybeAddContainers(results, pageIndex);
				
				pageIndex++;
			})
			.on("end", function()
			{
				expect(results).to.have.length(9);
				expect(results).to.all.all.containSubset(  // TODO :: https://github.com/chaijs/chai-things/issues/29
				{
					broken: false,
					excluded: false,
					excludedReason: null
				});
				done();
			})
			.enqueue("http://blc/disallowed/index.html");
		});
		
		
		
		it.skip("honorRobotExclusions = true (rel + meta + header + robots.txt)", function(done)
		{
			let pageIndex = 0;
			const results = [];
			
			new SiteChecker( helpers.options({ honorRobotExclusions:true }) )
			.on("junk", function(result)
			{
				maybeAddContainers(results, pageIndex);
				
				results[pageIndex][ result.html.index ] = result;
			})
			.on("link", function(result)
			{
				maybeAddContainers(results, pageIndex);
				
				results[pageIndex][ result.html.index ] = result;
			})
			.on("page", function(error)
			{
				expect(error).to.be.null;
				
				// If first page didn't load
				// If first page did load but had no links
				maybeAddContainers(results, pageIndex);
				
				pageIndex++;
			})
			.on("end", function()
			{
				expect(results).to.have.length(5);
				
				expect(results[0]).to.all.containSubset(
				{
					broken: false,
					excluded: false,
					excludedReason: null
				});
				
				// TODO :: https://github.com/chaijs/chai-things/issues/29
				for (let i=1; i<5; i++)
				{
					expect(results[i]).to.all.containSubset(
					{
						broken: null,
						excluded: true,
						excludedReason: "BLC_ROBOTS"
					});
				}
				
				done();
			})
			.enqueue("http://blc/disallowed/index.html");
		});
		
		
		
		// TODO :: honorRobotExcluses=true (rel + meta + header + robots.txt) + userAgent=Googlebot/2.1
	});
});
