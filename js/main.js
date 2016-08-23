require([
    "jquery",
    "d3",
    "underscore",
    "moment",
    "js/helper",
    "js/timecharts",
    "js/halo",
    "js/pies"
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
        .await(load_data);

    function load_data(
        error,
        json_latest,
        json_stats,
        json_timechart
    ) {
        _.mixin({
            "total": function(data, key) {
                return _(data).chain()
                    .pluck("spent")
                    .reduce(function(memo, num) {
                        return memo + parseInt(num);
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
                    .value()
        };

        data.outer = _(json_stats.results).map(function(v, i) {
            v.spent = parseInt(v.spent);
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

        //timecharts(data);
        pies(data);
        halo(data);
    }
});
