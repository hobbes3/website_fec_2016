require([
    "jquery",
    "d3",
    "underscore",
    "js/helper"
],
function(
    $,
    d3,
    _,
    helper
) {
    var green = "#2ca02c",
        red = "#d62728",
        width = $("#viz_pies").parent().innerWidth(),
        width = width > 800 ? 800 : width,
        height = width * 0.4,
        radius = height / 2 * 0.8,
        thickness = radius * 0.2;

    var svg = d3.select("svg#viz_pies")
            .attr({
                "width": width,
                "height": height
            });

    d3.json("/data/schedule_e.json", function(json) {
        var data = {};

        function by_toward(data, candidate) {
            return _(data).chain()
                .groupBy("toward")
                .map(function(v, k) {
                    return {
                        "toward": k,
                        "total": _(v).total("spent"),
                        "candidate": candidate
                    }
                })
                .value();
        };

        data.stats = {
            "total": _(json.results).total("spent"),
            "toward": by_toward(json.results, null),
            "candidate": _(json.results).chain()
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

        var pie = d3.layout.pie()
            .value(function(d) {
                return d.total;
            })
            .sort(function cmp(a, b) {
                return d3.descending(a.toward, b.toward);
            });

        var arc = d3.svg.arc()
            .innerRadius(radius - thickness)
            .outerRadius(radius);

        var candidate_g = svg.selectAll("g.candidate")
            .data(data.stats.candidate)
            .enter()
            .append("g")
                .attr({
                    "class": "candidate",
                    "transform": function(d, i) {
                        var x = (2 * i + 1) * width / (2 * data.stats.candidate.length);
                        var y = height * 0.8 / 2;

                        return "translate(" + [x, y] + ")";
                    }
                });

        var text = candidate_g
            .append("text")
                .attr({
                    "class": "candidate_total",
                    "x": 0,
                    "y": radius * 1.25,
                    "text-anchor": "middle"
                })
                .style("font-size", height * 0.09)
                .text(function(d) {
                    return "$" + helper.dollar_format(d.total) + " spent on " + d.candidate.capitalize();
                });

        var pie_data = candidate_g.selectAll("path.arc")
            .data(function(d) {
                return pie(d.toward);
            })
            .enter();

        var image = candidate_g
            .append("image")
                .attr({
                    "x": function(d) {
                        return thickness - radius;
                    },
                    "y": function(d) {
                        return thickness - radius;
                    },
                    "width": function(d) {
                        return 2 * (radius - thickness);
                    },
                    "height": function(d) {
                        return 2 * (radius - thickness);
                    },
                    "xlink:href": function(d) {
                        return "/images/" + d.candidate + "_head.png";
                    }
                });

        var arc = pie_data
            .append("path")
                .attr({
                    "class": "arc",
                    "d": function(d) {
                        return arc(d);
                    }
                })
                .style("fill", function(d) {
                    return d.data.toward === "supporting" ? green : red;
                })
                .on("mouseover", function(d) {
                    var toward = d.data.toward,
                        candidate = d.data.candidate,
                        name = candidate.capitalize(),
                        spent = d.data.total,
                        total = _(data.stats.candidate).findWhere({"candidate": candidate}).total,
                        pct = Math.round(spent / total * 100);

                    helper.tooltip
                        .style("visibility", "visible")
                        .text(
                            "$" + helper.dollar_format(spent) + " (" + helper.pct_label(pct) + ") spent " + toward + " " + name
                        );;
                })
                .on("mousemove", helper.tooltip_position)
                .on("mouseout", function(d) {
                    helper.tooltip.style("visibility", "hidden");
                });
    });
});
