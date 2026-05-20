import logging
from pathlib import Path


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")
logger = logging.getLogger(__name__)
MODEL_ROOT = Path(__file__).resolve().parents[1] / "models"


def main():
    from insightface.app import FaceAnalysis

    logger.info("Preloading InsightFace model buffalo_s")
    app = FaceAnalysis(name="buffalo_s", root=str(MODEL_ROOT), providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=-1, det_size=(320, 320))
    logger.info("InsightFace model buffalo_s is ready")


if __name__ == "__main__":
    main()
