require([
    "jquery",
    "d3",
    "d3-queue",
    "underscore",
    "moment",
    "js/helper",
    "js/halo",
    "js/pies"
],
function(
    $,
    d3,
    d3_queue,
    _,
    moment,
    helper,
    halo,
    pies
) {
    var data = {
        "green": "#2ca02c",
        "red": "#d62728"
    };

    d3_queue()
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
        var time = json_latest.results[0]._time,
            latest = time.substring(0, time.indexOf("T")),
            updated = json_latest.results[0].now;

        $("#latest").text(moment(latest, "YYYY-MM-DD").format("MMM Do YYYY"));
        $("#updated").text(moment(updated, "X").fromNow());

        $("#total").text("$" + helper.dollar_format(data.stats.total));

        pies(data);
        halo(data);
    }
});
