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
        // Evaluator must return show:true or every label stays hidden.
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
      // Bright fill + dark halo reads on Esri satellite.
      color: new Color().setStyle("#f8fafc"),
      outlineColor: new Color().setStyle("#0b1220"),
      outlineWidth: 2.5,
      size: 14,
      sizeInMeters: false,
      // Non-draped upright billboards stay readable at Africa / globe height;
      // draped text can disappear into tile bake at this camera.
      clampToGround: false,
      textFacing: "upright",
      rotateWithCamera: true,
      offsetDepth: true,
      // Keep major names even when dense at continent scale.
      declutter: true,
      declutterPriority: 10,
      show: true,
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
      color: new Color().setStyle("#e2e8f0"),
      outlineColor: new Color().setStyle("#0b1220"),
      outlineWidth: 2,
      size: 11,
      sizeInMeters: false,
      clampToGround: false,
      textFacing: "upright",
      rotateWithCamera: true,
      offsetDepth: true,
      declutter: true,
      declutterPriority: 1,
      show: true,
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
