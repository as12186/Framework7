/*======================================================
************   Pages   ************
======================================================*/
// Page Callbacks API
app.pageCallbacks = {};

app.onPage = function (callbackName, pageName, callback) {
    if (pageName && pageName.split(' ').length > 1) {
        var pageNames = pageName.split(' ');
        var returnCallbacks = [];
        for (var i = 0; i < pageNames.length; i++) {
            returnCallbacks.push(app.onPage(callbackName, pageNames[i], callback));
        }
        returnCallbacks.remove = function () {
            for (var i = 0; i < returnCallbacks.length; i++) {
                returnCallbacks[i].remove();
            }
        };
        returnCallbacks.trigger = function () {
            for (var i = 0; i < returnCallbacks.length; i++) {
                returnCallbacks[i].trigger();
            }
        };
        return returnCallbacks;
    }
    var callbacks = app.pageCallbacks[callbackName][pageName];
    if (!callbacks) {
        callbacks = app.pageCallbacks[callbackName][pageName] = [];
    }
    app.pageCallbacks[callbackName][pageName].push(callback);
    return {
        remove: function () {
            var removeIndex;
            for (var i = 0; i < callbacks.length; i++) {
                if (callbacks[i].toString() === callback.toString()) {
                    removeIndex = i;
                }
            }
            if (typeof removeIndex !== 'undefined') callbacks.splice(removeIndex, 1);
        },
        trigger: callback
    };
};

//Create callbacks methods dynamically
function createPageCallback(callbackName) {
    var capitalized = callbackName.replace(/^./, function (match) {
        return match.toUpperCase();
    });
    app['onPage' + capitalized] = function (pageName, callback) {
        return app.onPage(callbackName, pageName, callback);
    };
}

var pageCallbacksNames = ('beforeInit init beforeAnimation afterAnimation beforeRemove').split(' ');
for (var i = 0; i < pageCallbacksNames.length; i++) {
    app.pageCallbacks[pageCallbacksNames[i]] = {};
    createPageCallback(pageCallbacksNames[i]);
}

app.triggerPageCallbacks = function (callbackName, pageName, pageData) {
    var allPagesCallbacks = app.pageCallbacks[callbackName]['*'];
    if (allPagesCallbacks) {
        for (var j = 0; j < allPagesCallbacks.length; j++) {
            allPagesCallbacks[j](pageData);
        }
    }
    var callbacks = app.pageCallbacks[callbackName][pageName];
    if (!callbacks || callbacks.length === 0) return;
    for (var i = 0; i < callbacks.length; i++) {
        callbacks[i](pageData);
    }
};

// On Page Init Callback
app.pageInitCallback = function (view, pageContainer, url, position, navbarInnerContainer) {
    if (pageContainer.f7PageInitialized) return;
    pageContainer.f7PageInitialized = true;
    // Page Data
    var pageData = {
        container: pageContainer,
        url: url,
        query: $.parseUrlQuery(url || ''),
        name: $(pageContainer).attr('data-page'),
        view: view,
        from: position,
        navbarInnerContainer: navbarInnerContainer
    };

    // Store pagedata in page
    pageContainer.f7PageData = pageData;

    // Update View's activePage
    if (view) view.activePage = pageData;

    // Before Init Callbacks
    app.pluginHook('pageBeforeInit', pageData);
    if (app.params.onPageBeforeInit) app.params.onPageBeforeInit(app, pageData);
    app.triggerPageCallbacks('beforeInit', pageData.name, pageData);
    $(pageData.container).trigger('pageBeforeInit', {page: pageData});

    // Init page
    app.initPage(pageContainer);

    // Init Callback
    app.pluginHook('pageInit', pageData);
    if (app.params.onPageInit) app.params.onPageInit(app, pageData);
    app.triggerPageCallbacks('init', pageData.name, pageData);
    $(pageData.container).trigger('pageInit', {page: pageData});
};
app.pageRemoveCallback = function (view, pageContainer, position) {
    // Page Data
    var pageData = {
        container: pageContainer,
        name: $(pageContainer).attr('data-page'),
        view: view,
        from: position
    };
    // Before Init Callback
    app.pluginHook('pageBeforeRemove', pageData);
    if (app.params.onPageBeforeRemove) app.params.onPageBeforeRemove(app, pageData);
    app.triggerPageCallbacks('beforeRemove', pageData.name, pageData);
    $(pageData.container).trigger('pageBeforeRemove', {page: pageData});
};
app.pageAnimCallbacks = function (callback, view, params) {
    // Page Data
    var pageData = {
        container: params.pageContainer,
        url: params.url,
        query: $.parseUrlQuery(params.url || ''),
        name: $(params.pageContainer).attr('data-page'),
        view: view,
        from: params.position,
        swipeBack: params.swipeBack
    };
    var oldPage = params.oldPage,
        newPage = params.newPage;

    // Update page date
    params.pageContainer.f7PageData = pageData;

    if (callback === 'after') {
        app.pluginHook('pageAfterAnimation', pageData);
        if (app.params.onPageAfterAnimation) app.params.onPageAfterAnimation(app, pageData);
        app.triggerPageCallbacks('afterAnimation', pageData.name, pageData);
        $(pageData.container).trigger('pageAfterAnimation', {page: pageData});

    }
    if (callback === 'before') {
        // Add data-page on view
        $(view.container).attr('data-page', pageData.name);

        // Update View's activePage
        if (view) view.activePage = pageData;

        // Hide/show navbar dynamically
        if (newPage.hasClass('no-navbar') && !oldPage.hasClass('no-navbar')) {
            view.hideNavbar();
        }
        if (!newPage.hasClass('no-navbar') && oldPage.hasClass('no-navbar')) {
            view.showNavbar();
        }
        // Hide/show navbar toolbar
        if (newPage.hasClass('no-toolbar') && !oldPage.hasClass('no-toolbar')) {
            view.hideToolbar();
        }
        if (!newPage.hasClass('no-toolbar') && oldPage.hasClass('no-toolbar')) {
            view.showToolbar();
        }
        // Callbacks
        app.pluginHook('pageBeforeAnimation', pageData);
        if (app.params.onPageBeforeAnimation) app.params.onPageBeforeAnimation(app, pageData);
        app.triggerPageCallbacks('beforeAnimation', pageData.name, pageData);
        $(pageData.container).trigger('pageBeforeAnimation', {page: pageData});
    }
};

// Init Page Events and Manipulations
app.initPage = function (pageContainer) {
    // Size navbars on page load
    if (app.sizeNavbars) app.sizeNavbars($(pageContainer).parents('.' + app.params.viewClass)[0]);
    // Init messages
    if (app.initMessages) app.initMessages(pageContainer);
    // Init forms storage
    if (app.initFormsStorage) app.initFormsStorage(pageContainer);
    // Init smart select
    if (app.initSmartSelects) app.initSmartSelects(pageContainer);
    // Init slider
    if (app.initSlider) app.initSlider(pageContainer);
    // Init pull to refres
    if (app.initPullToRefresh) app.initPullToRefresh(pageContainer);
    // Init infinite scroll
    if (app.initInfiniteScroll) app.initInfiniteScroll(pageContainer);
    // Init searchbar
    if (app.initSearchbar) app.initSearchbar(pageContainer);
    // Init message bar
    if (app.initMessagebar) app.initMessagebar(pageContainer);
};
