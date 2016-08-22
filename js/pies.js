define([
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
    return function(data) {
        var green = data.green,
            red = data.red,
            width = Math.min($("#viz_pies").parent().innerWidth(), 850),
            height = width * 0.4,
            radius = height / 2 * 0.8,
            thickness = radius * 0.2;

        var svg = d3.select("svg#viz_pies")
            .attr("width", width)
            .attr("height", height);

        var pie = d3.pie()
            .value(function(d) {
                return d.total;
            })
            .sort(function cmp(a, b) {
                return d3.descending(a.toward, b.toward);
            });

        var arc = d3.arc()
            .innerRadius(radius - thickness)
            .outerRadius(radius);

        var candidate_g = svg.selectAll("g.candidate")
            .data(data.stats.candidate)
            .enter()
            .append("g")
                .attr("class", "candidate")
                .attr("transform", function(d, i) {
                    var x = (2 * i + 1) * width / (2 * data.stats.candidate.length);
                    var y = height * 0.8 / 2;

                    return "translate(" + [x, y] + ")";
                });

        var text = candidate_g
            .append("text")
                .attr("class", "candidate_total")
                .attr("x", 0)
                .attr("y", radius * 1.25)
                .attr("text-anchor", "middle")
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
                .attr("x", function(d) {
                    return thickness - radius;
                })
                .attr("y", function(d) {
                    return thickness - radius;
                })
                .attr("width", function(d) {
                    return 2 * (radius - thickness);
                })
                .attr("height", function(d) {
                    return 2 * (radius - thickness);
                })
                .attr("xlink:href", function(d) {
                    return "/images/" + d.candidate + "_head.png";
                })
                .on("mouseover", function(d) {
                    helper.tooltip
                        .style("visibility", "visible")
                        .text(d.candidate.capitalize());
                })
                .on("mousemove", helper.tooltip_position)
                .on("mouseout", function(d) {
                    helper.tooltip.style("visibility", "hidden");
                });

        var arc_path = pie_data
            .append("path")
                .attr("class", "arc")
                .attr("d", function(d) {
                    return arc(d);
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
    };
});
