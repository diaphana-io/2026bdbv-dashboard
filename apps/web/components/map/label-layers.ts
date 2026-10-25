import {
  Color,
  fetchFontFamilyFromCss,
  type Layer,
  type Source,
} from "@navaramap/three";
import type ThreeView from "@navaramap/three";
import type { DefaultDescriptions } from "@navaramap/three-default-plugin";
import countryLabelsData from "../../data/country_labels.json";
import majorCitiesData from "../../data/major_cities.json";

type View = ThreeView<DefaultDescriptions>;

export type LabelLayersHandle = {
  setCountryNamesVisible: (visible: boolean) => void;
  setCitiesVisible: (visible: boolean) => void;
  destroy: () => void;
};

const LABEL_FONT = "Noto Sans";

const countryLabels = countryLabelsData as {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: unknown;
  }>;
};

const majorCities = majorCitiesData as {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: unknown;
  }>;
};

function filterCountryLabels() {
  return {
    type: "FeatureCollection" as const,
    features: countryLabels.features.filter((f) => {
      const rank = f.properties?.["labelrank"];
      return typeof rank === "number" ? rank <= 4 : true;
    }),
  };
}

function filterCities() {
  return {
    type: "FeatureCollection" as const,
    features: majorCities.features.filter((f) => {
      const rank = f.properties?.["scalerank"];
      const capital = f.properties?.["capital"];
      return (
        (typeof rank === "number" && rank <= 2) || capital === true
      );
    }),
  };
}

function wireText(layer: Layer) {
  layer.on("featureUpdated", ({ evaluator }) => {
    evaluator.evaluate(
      ({ properties }) => {
        const text = (properties?.["name"] as string) ?? "";
        return { text, show: Boolean(text) };
      },
      { filters: ["name"] },
    );
  });
}

/** Register font once per view, then attach static country/city labels. */
export async function attachLabelLayers(
  view: View,
): Promise<LabelLayersHandle> {
  view.addFontFamily(
    await fetchFontFamilyFromCss(
      LABEL_FONT,
      "https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600&display=swap",
    ),
  );

  const countrySource = view.addSource({
    type: "geojson",
    data: filterCountryLabels() as GeoJSON.FeatureCollection,
  });
  const countryLayer = view.addLayer({
    type: "vector",
    source: countrySource,
    text: {
      font: LABEL_FONT,
      color: new Color().setStyle("#e2e8f0"),
      outlineColor: new Color().setStyle("#071525"),
      outlineWidth: 2,
      size: 12,
      sizeInMeters: false,
      clampToGround: true,
      declutter: true,
    },
  });
  wireText(countryLayer);

  const citySource = view.addSource({
    type: "geojson",
    data: filterCities() as GeoJSON.FeatureCollection,
  });
  const cityLayer = view.addLayer({
    type: "vector",
    source: citySource,
    text: {
      font: LABEL_FONT,
      color: new Color().setStyle("#f1f5f9"),
      outlineColor: new Color().setStyle("#071525"),
      outlineWidth: 2,
      size: 10,
      sizeInMeters: false,
      clampToGround: true,
      declutter: true,
    },
  });
  wireText(cityLayer);

  let countryVisible = true;
  let cityVisible = true;

  return {
    setCountryNamesVisible(next) {
      if (countryVisible === next) return;
      countryVisible = next;
      countryLayer.update({ text: { show: next } });
    },
    setCitiesVisible(next) {
      if (cityVisible === next) return;
      cityVisible = next;
      cityLayer.update({ text: { show: next } });
    },
    destroy() {
      countryLayer.delete();
      cityLayer.delete();
      countrySource.delete();
      citySource.delete();
    },
  };
}
