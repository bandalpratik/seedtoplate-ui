import { api } from '../lib/apiClient';

function toUiBatch(batch) {
  const releases = batch.releases ?? [];
  const latestRelease = releases.at(-1);

  return {
    ...batch,
    seedVariety: batch.variety,
    unreleasedKg: batch.availableYieldKg,
    plannedYieldKg: batch.plannedYieldKg ?? batch.actualYieldKg ?? batch.availableYieldKg,
    queueCount: batch.queueDepth ?? 0,
    queuedKg: batch.queuedKg ?? 0,
    finalRetailPricePerKg: batch.finalRetailPricePerKg ?? latestRelease?.pricePerKg ?? null,
    isChemicalFree: batch.isChemicalFree ?? true,
  };
}

/** GET /crops — paginated live farm feed. */
export function getCropFeed({ stage, isChemicalFree, page = 0, size = 20 } = {}) {
  return api.get('/crops', { params: { stage, isChemicalFree, page, size } }).then((content) => ({
    content: Array.isArray(content) ? content.map(toUiBatch) : [],
    page,
    size,
    totalElements: Array.isArray(content) ? content.length : 0,
  }));
}

export function getCropById(batchId) {
  return api.get(`/crops/${batchId}`).then((batch) => toUiBatch(batch));
}

/** GET /crops/{batchId}/timeline — the batch story. */
export function getCropTimeline(batchId) {
  return Promise.all([getCropById(batchId), getBatchReleases(batchId)]).then(([batch, releases]) => {
    const timeline = [];
    const stageLabel = batch.currentStage ? batch.currentStage.replace(/_/g, ' ').toLowerCase() : 'updated';

    timeline.push({
      id: `${batchId}-stage`,
      eventDate: new Date().toISOString(),
      title: `Crop is ${stageLabel}`,
      description: batch.description || `${batch.cropName} is currently ${stageLabel}.`,
      stage: batch.currentStage,
    });

    releases.forEach((release, index) => {
      timeline.push({
        id: release.id ?? `${batchId}-release-${index}`,
        eventDate: release.releasedAt,
        title: `Tranche released at ${release.pricePerKg}/kg`,
        description: release.note || `${release.releasedKg} kg allocated in FIFO order.`,
        stage: 'BATCH_RELEASED',
      });
    });

    return {
      ...batch,
      timeline,
      releases,
    };
  });
}

/** GET /crops/{batchId}/releases — the tranche history behind the price. */
export function getBatchReleases(batchId) {
  return api.get(`/crops/${batchId}/releases`).then((releases) =>
    (Array.isArray(releases) ? releases : []).map((release) => ({
      ...release,
      batchId: release.batchId ?? batchId,
    })),
  );
}
