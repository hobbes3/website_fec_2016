require([
    "jquery",
    "d3",
    "underscore",
    "moment",
    "js/helper",
    "js/timecharts",
    "js/halo",
    "js/pies",
    "jquery_waypoint"
],
function(
    $,
    d3,
    _,
    moment,
    helper,
    timecharts,
    halo,
    pies
) {
    var data = {
        "green": "#2ca02c",
        "red": "#d62728"
    };

    d3.queue()
        .defer(d3.json, "/data/schedule_e_latest.json")
        .defer(d3.json, "/data/schedule_e_stats.json")
        .defer(d3.json, "/data/schedule_e_timechart.json")
        .defer(d3.json, "/data/polls.json")
        .await(load_data);

    function load_data(
        error,
        json_latest,
        json_stats,
        json_timechart,
        json_polls
    ) {
        _.mixin({
            "total": function(data, key) {
                return _(data).chain()
                    .pluck(key)
                    .reduce(function(memo, num) {
                        return memo + parseFloat(num);
                    }, 0)
                    .value();
            }
        });

        function by_toward(data, candidate) {
            return _(data).chain()
                .groupBy("toward")
                .map(function(v, k) {
                    var obj = {
                        "toward": k,
                        "total": _(v).total("spent")
                    }

                    if(candidate) obj.candidate = candidate;

                    return obj;
               })
               .value();
        };

        data.stats = {
            "total": _(json_stats.results).total("spent"),
            "toward": by_toward(json_stats.results, null),
            "candidate": _(json_stats.results).chain()
                    .groupBy("candidate")
                    .map(function(v, k) {
                        return {
                            "candidate": k,
                            "total": _(v).total("spent"),
                            "toward": by_toward(v, k)
                        };
                    })
                    .value(),
            "timechart": {
                "max_spent": 0,
                "min_poll": {},
                "max_poll_range": 0
            }
        };

        data.outer = _(json_stats.results).map(function(v, i) {
            v.spent = parseFloat(v.spent);
            v._index = i;

            return v;
        });

        data.inner = _(data.outer).chain()
            .groupBy("candidate")
            .map(function(v, k) {
                return {
                    "candidate": k,
                    "data": v
                };
            })
            .value();

        data.timechart = [];

        _(json_timechart.results).each(function(v) {
            // ex. 2016-08-17T00:00:00.000+00:00
            var date = v._time.substring(0, v._time.indexOf("T"));

            _(v).chain()
                .pick(function(vv, kk) {
                    return kk.charAt(0) !== "_";
                })
                .map(function(vv, kk) {
                    var matches = /^([^_]+)_(.+)$/.exec(kk);

                    var obj = {
                        "candidate": matches[1]
                    };

                    obj[matches[2]] = parseFloat(vv);

                    return obj;
                })
                .groupBy("candidate")
                .each(function(vv, kk) {
                    var obj = _(vv).reduce(function(memo, value) {
                        return _(memo).extend(value);
                    }, {});

                    obj.date = moment.utc(date);

                    var poll = _(json_polls.estimates_by_date).findWhere({"date": date});

                    obj.poll = poll ? _(poll.estimates).findWhere({"choice": kk.capitalize()}).value : null;

                    var candidate = _(data.timechart).findWhere({"candidate": kk});

                    if(candidate) {
                        candidate.data.push(obj);
                    }
                    else {
                        data.timechart.push({
                            "candidate": kk,
                            "data": [obj]
                        });
                    }
                });
        });

        _(data.timechart).each(function(v) {
            var max_supporting = _(v.data).chain().pluck("supporting").max().value(),
                max_opposing = _(v.data).chain().pluck("opposing").max().value(),
                p_max = _(v.data).chain().pluck("poll").compact().max().value(),
                p_min = _(v.data).chain().pluck("poll").compact().min().value();

            data.stats.timechart.min_poll[v.candidate] = p_min;

            data.stats.timechart.max_spent = Math.max(data.stats.timechart.max_spent, max_supporting, max_opposing);
            data.stats.timechart.max_poll_range = Math.max(data.stats.timechart.max_poll_range, p_max - p_min);
        });

        // ex. 2016-08-17T00:00:00.000+00:00
        var clinton = _(data.stats.candidate).findWhere({"candidate": "clinton"}).total,
            trump = _(data.stats.candidate).findWhere({"candidate": "trump"}).total,
            factor = Math.round(trump / clinton)
            time = json_latest.results[0]._time,
            latest = time.substring(0, time.indexOf("T")),
            updated = json_latest.results[0].now;

        $("#latest").text(moment(latest, "YYYY-MM-DD").format("MMM Do YYYY"));
        $("#updated").text(moment(updated, "X").fromNow());

        $("#total").text("$" + helper.dollar_format(data.stats.total));
        $("#factor").text(factor);

        // Image enlarge
        $("body").append('<div class="modal fade" id="imagemodal" role="dialog" style="width: 90%; margin: 0 auto;"><div class="modal-admin"><div class="modal-content"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">&times;</button></div><div class="modal-body"><img src="" class="imagepreview" style="width: 100%;"></div><div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Close</button></div></div></div></div>');

        $(".img-pop").on('click', function(e) {
            e.preventDefault();
            var src = $(this).find("img").data("src") || $(this).find("img").attr("src");
            $(".imagepreview").attr("src", src);
            $("#imagemodal").modal("show");
        });

        timecharts(data);
        pies(data);
        halo(data);

        var halo_animated = false;

        $("#section_halo").waypoint({
            handler: function() {
                if(!halo_animated) {
                    $("#toward_controls > .active").next("label").find("input").trigger("click");
                }

                halo_animated = true;
            }
        })
    }
});
