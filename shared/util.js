const addLatencyAndPackagesLoss = (fnc, loss = true) => {
    fnc(); return;
    // if (loss && Math.random() > 0.8) return; // 10% package loss
    // setTimeout(() => fnc(), 100 + Math.random() * 200); // random latency between 100 and 300
}
exports.addLatencyAndPackagesLoss = addLatencyAndPackagesLoss;