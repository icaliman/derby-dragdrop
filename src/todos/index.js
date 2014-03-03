
var app = require('derby').createApp(module);

app.get('/', function (page) {
    return page.redirect('/home');
});

app.get('/:groupName', function (page, model, _arg, next) {

    var groupName = _arg.groupName;

    var group = model.at("forms." + groupName);

    group.subscribe(function (err) {
        if (err) return next(err);

        var itemIds = group.at('formItems');
        if (!itemIds.get()) {
            var id0 = model.add('allItems', {
                type: "textinput",
                text: 'Edit me :)'
            });
            var id1 = model.add('allItems', {
                type: "textarea",
                text: 'Edit me :)'
            });
            itemIds.set([id0, id1]);
        }

        model.query('allItems', itemIds).subscribe(function (err) {
            if (err) return next(err);

            model.refList('_page.list', 'allItems', itemIds);

            page.render();
        });
    });
});

app.ready(function (model) {
    var _this = this;
    var from = null;
    var itemId = null;
    var list = model.at('_page.list');

    model.on("insert", "_page.list", function (i, items, passed) {
        console.log("INSERT: ", i, items, passed);

        console.log(list.get());
    });

    $("#sortable").sortable({
        revert: 300,
        forcePlaceholderSize: true,
        receive: function (event, ui) {
            itemId = ui.item.attr("id");
        },
        start: function (event, ui) {
            from = ui.item.index();
        },
        stop: function (event, ui) {
            var to = ui.item.index();

            if (itemId) {
                list.insert(to, {
                    text: "Test" + to,
                    type: itemId
                });
                itemId = null;

                ui.item.remove();
            } else {
                $("#sortable").sortable('cancel');

                list.move(from, to);

//                var it = list.get(from);
//
//                list.at(from).remove();
//                list.insert(to, it);

                from = null;
            }
        }
    });

    $(".draggable").draggable({
        connectToSortable: "#sortable",
        helper: "clone",
        revert: false
    });

    $("ul, li").disableSelection();
});
