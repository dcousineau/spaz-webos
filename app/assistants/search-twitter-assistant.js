function SearchTwitterAssistant(args) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	
	scene_helpers.addCommonSceneMethods(this);
	
	if (args.searchterm) {
		this.passedSearch = args.searchterm;
	}
}

SearchTwitterAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Luna.View.render to render view templates and add them to the scene, if needed. */
	
	
	this.setupCommonMenus({
		viewMenuItems: [
			{
				items: [
					{label:$L('Search Twitter'), command:'scroll-top', 'class':"palm-header left"},
					// {label: $L('Show me'), iconPath:'images/theme/menu-icon-triangle-down.png', submenu:'filter-menu'},
				]
			},
			{
				items: [
					{label:$L('Compose'),  icon:'compose', command:'compose', shortcut:'N'},
					{label:$L('Update'),   icon:'sync', command:'refresh', shortcut:'R'}					
				]
			}
		],
		cmdMenuItems: [{ items:
			[
				{},
				{label:$L('Home'),        command:'home', shortcut:'H'},
				{label:$L('My Timeline'), icon:'conversation', command:'my-timeline', shortcut:'T'},
				{label:$L('Search'),      icon:'search', command:'search', shortcut:'S', disabled:true},
				{label:$L('Followers'),   command:'followers', shortcut:'L'},
				{}
			]
		}]
	});

	this.scroller = this.controller.getSceneScroller();
	
	this.searchBoxAttr = {
		"hintText":	      'Enter search terms…',
		"filterFunction": this.search.bind(this),
		"focusMode":      Luna.Widget.focusSelectMode,
		// "changeOnKeyPress":true
		
	};
	this.searchBoxModel = {
		'value':     null,
		'disabled':  false
	}
	
	this.controller.setupWidget('search-twitter-textfield', this.searchBoxAttr, this.searchBoxModel);
	
	
	// this.comboBoxAttr = {
	// 	"hintText":		'Enter search terms…',
	// 	"filterFunction":this.search.bind(this),
	// 	"template":		'combobox/combobox-listitem'
	// };
	// this.comboBoxModel = {
	// 	
	// }
	// 
	// this.controller.setupWidget('search-twitter-combobox', this.comboBoxAttr, this.comboBoxModel);
	// 
	/* add event handlers to listen to events from widgets */
	Luna.Event.listen($('search-twitter-textfield'), Luna.Event.propertyChange, this.search.bind(this));
	

	
}

SearchTwitterAssistant.prototype.search = function(e) {
	console.log("search called");
	
	/*
		clear any existing results
	*/
	jQuery('#search-timeline').empty();
	
	this.spinnerOn();
	
	if (sch.isString(e)) {
		console.dir(e);
		sc.app.twit.search(e);
	} else {
		console.dir(e);
		sc.app.twit.search(e.value);		
	}
}


SearchTwitterAssistant.prototype.refresh = function() {
	this.search(this.searchBoxModel.value);
};


SearchTwitterAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	console.log('getScenes()');
	console.dir(Luna.Controller.stageController.getScenes());
	console.log('activeScene()');
	console.dir(Luna.Controller.stageController.activeScene());
	console.log('topScene()');
	console.dir(Luna.Controller.stageController.topScene());
	console.log('isChildWindow()');
	console.dir(Luna.Controller.stageController.isChildWindow());
	
	if (event && event.searchterm) {
		this.passedSearch = event.searchterm;
	}
	
	
	if (this.passedSearch) {
		this.searchBoxModel.value = this.passedSearch;
		this.controller.modelChanged(this.searchBoxModel);
		this.search(this.passedSearch);
		this.passedSearch = null; // eliminate this so it isn't used anymore
	}
	
	this.addPostPopup();
	
	
	var thisA = this; // for closures below
	
	jQuery().bind('new_search_timeline_data', { thisAssistant:this }, function(e, tweets) {

		console.dir(e.data.thisAssistant);

		console.log('seach\'s tweets:');
		console.dir(tweets);

		/*
			reverse the tweets for collection rendering (faster)
		*/
		var rendertweets = tweets;

		jQuery.each( rendertweets, function() {
			console.dir(this)
			this.text = makeItemsClickable(this.text);
			
			var itemhtml = Luna.View.render({object: this, template: 'search-twitter/search-item'});
			
			/*
				make jQuery obj
			*/
			var jqitem = jQuery(itemhtml);
			
			console.log('data for item:');
			console.log(jQuery.data(jqitem.get(0)));
			/*
				attach data object to item html
			*/
			jqitem.data('item', this);
			
			dump(jqitem.attr('class'))
			
			// dump(this.user.screen_name +" is from "+ this.SC_timeline_from);
			
			/*
				put item on timeline
			*/
			jQuery('#search-timeline').prepend(jqitem);
		});


		/*
			Update relative dates
		*/
		sch.updateRelativeTimes('#search-timeline>div.timeline-entry>.status>.meta>.date', 'data-created_at');
		e.data.thisAssistant.spinnerOff();

		
	});
	
	/*
		listen for clicks on user avatars
		Note that these will hear clicks across all active scenes, not just
		this one.
	*/
	jQuery('div.timeline-entry>.user', this.scroller).live(Luna.Event.tap, function(e) {
		var userid = jQuery(this).attr('data-user-screen_name');
		Luna.Controller.stageController.pushScene('user-detail', userid);
	});
	
	jQuery('.username.clickable', this.scroller).live(Luna.Event.tap, function(e) {
		var userid = jQuery(this).attr('data-user-screen_name');
		Luna.Controller.stageController.pushScene('user-detail', userid);
	});

	jQuery('.hashtag.clickable', this.scroller).live(Luna.Event.tap, function(e) {
		var hashtag = jQuery(this).attr('data-hashtag');
		thisA.searchFor('#'+hashtag);
	});

	jQuery('div.timeline-entry>.status>.meta', this.scroller).live(Luna.Event.tap, function(e) {
		var statusid = jQuery(this).attr('data-status-id');
		Luna.Controller.stageController.pushScene('message-detail', statusid);
	});
}


SearchTwitterAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
	
	Luna.Event.stopListening($('search-twitter-textfield'), Luna.Event.propertyChange, this.search);
	
	jQuery().unbind('new_search_timeline_data');
	
	jQuery('div.timeline-entry>.user', this.scroller).die(Luna.Event.tap);
	jQuery('.username.clickable', this.scroller).die(Luna.Event.tap);
	jQuery('.hashtag.clickable', this.scroller).die(Luna.Event.tap);
	jQuery('div.timeline-entry>.status>.meta', this.scroller).die(Luna.Event.tap);
	
	this.removePostPopup();
}

SearchTwitterAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
}