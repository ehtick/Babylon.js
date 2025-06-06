﻿#define PBR_FRAGMENT_SHADER

#define CUSTOM_FRAGMENT_EXTENSION

#if defined(BUMP) || !defined(NORMAL) || defined(FORCENORMALFORWARD) || defined(SPECULARAA) || defined(CLEARCOAT_BUMP) || defined(ANISOTROPIC)
#extension GL_OES_standard_derivatives : enable
#endif

#ifdef LODBASEDMICROSFURACE
#extension GL_EXT_shader_texture_lod : enable
#endif

#define CUSTOM_FRAGMENT_BEGIN

#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif

#include<prePassDeclaration>[SCENE_MRT_COUNT]

precision highp float;
#include<oitDeclaration>

// Forces linear space for image processing
#ifndef FROMLINEARSPACE
    #define FROMLINEARSPACE
#endif

// Declaration
#include<__decl__pbrFragment>

#include<pbrFragmentExtraDeclaration>
#include<__decl__lightFragment>[0..maxSimultaneousLights]
#include<pbrFragmentSamplersDeclaration>
#include<imageProcessingDeclaration>
#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>

// Helper Functions
#include<helperFunctions>
#include<subSurfaceScatteringFunctions>
#include<importanceSampling>
#include<pbrHelperFunctions>
#include<imageProcessingFunctions>
#include<shadowsFragmentFunctions>
#include<harmonicsFunctions>
#include<pbrDirectLightingSetupFunctions>
#include<pbrDirectLightingFalloffFunctions>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
#include<pbrDirectLightingFunctions>
#include<pbrIBLFunctions>
#include<bumpFragmentMainFunctions>
#include<bumpFragmentFunctions>

#ifdef REFLECTION
    #include<reflectionFunction>
#endif

#define CUSTOM_FRAGMENT_DEFINITIONS

#include<pbrBlockAlbedoOpacity>
#include<pbrBlockReflectivity>
#include<pbrBlockAmbientOcclusion>
#include<pbrBlockAlphaFresnel>
#include<pbrBlockAnisotropic>
#include<pbrBlockReflection>
#include<pbrBlockSheen>
#include<pbrBlockClearcoat>
#include<pbrBlockIridescence>
#include<pbrBlockSubSurface>

// _____________________________ MAIN FUNCTION ____________________________
void main(void) {

    #define CUSTOM_FRAGMENT_MAIN_BEGIN

    #include<clipPlaneFragment>

    // _____________________________ Geometry Information ____________________________
    #include<pbrBlockNormalGeometric>

    #include<bumpFragment>

    #include<pbrBlockNormalFinal>

    // _____________________________ Albedo & Opacity ______________________________
    albedoOpacityOutParams albedoOpacityOut;

#ifdef ALBEDO
    vec4 albedoTexture = texture2D(albedoSampler, vAlbedoUV + uvOffset);
#endif

#ifdef BASE_WEIGHT
    vec4 baseWeightTexture = texture2D(baseWeightSampler, vBaseWeightUV + uvOffset);
#endif

#ifdef OPACITY
    vec4 opacityMap = texture2D(opacitySampler, vOpacityUV + uvOffset);
#endif

#ifdef DECAL
    vec4 decalColor = texture2D(decalSampler, vDecalUV + uvOffset);
#endif

    albedoOpacityOut = albedoOpacityBlock(
        vAlbedoColor
    #ifdef ALBEDO
        , albedoTexture
        , vAlbedoInfos
    #endif
        , baseWeight
    #ifdef BASE_WEIGHT
        , baseWeightTexture
        , vBaseWeightInfos
    #endif
    #ifdef OPACITY
        , opacityMap
        , vOpacityInfos
    #endif
    #ifdef DETAIL
        , detailColor
        , vDetailInfos
    #endif
    #ifdef DECAL
        , decalColor
        , vDecalInfos
    #endif
    );

    vec3 surfaceAlbedo = albedoOpacityOut.surfaceAlbedo;
    float alpha = albedoOpacityOut.alpha;

    #define CUSTOM_FRAGMENT_UPDATE_ALPHA

    #include<depthPrePass>

    #define CUSTOM_FRAGMENT_BEFORE_LIGHTS

    // _____________________________ AO  _______________________________
    ambientOcclusionOutParams aoOut;

#ifdef AMBIENT
    vec3 ambientOcclusionColorMap = texture2D(ambientSampler, vAmbientUV + uvOffset).rgb;
#endif

    aoOut = ambientOcclusionBlock(
    #ifdef AMBIENT
        ambientOcclusionColorMap,
        vAmbientInfos
    #endif
    );

    #include<pbrBlockLightmapInit>

#ifdef UNLIT
    vec3 diffuseBase = vec3(1., 1., 1.);
#else // !UNLIT

    // _____________________________ Reflectivity _______________________________
    vec3 baseColor = surfaceAlbedo;

    reflectivityOutParams reflectivityOut;

#if defined(REFLECTIVITY)
    vec4 surfaceMetallicOrReflectivityColorMap = texture2D(reflectivitySampler, vReflectivityUV + uvOffset);
    vec4 baseReflectivity = surfaceMetallicOrReflectivityColorMap;
    #ifndef METALLICWORKFLOW
        #ifdef REFLECTIVITY_GAMMA
            surfaceMetallicOrReflectivityColorMap = toLinearSpace(surfaceMetallicOrReflectivityColorMap);
        #endif
        surfaceMetallicOrReflectivityColorMap.rgb *= vReflectivityInfos.y;
    #endif
#endif

#if defined(MICROSURFACEMAP)
    vec4 microSurfaceTexel = texture2D(microSurfaceSampler, vMicroSurfaceSamplerUV + uvOffset) * vMicroSurfaceSamplerInfos.y;
#endif

#ifdef METALLICWORKFLOW
    vec4 metallicReflectanceFactors = vMetallicReflectanceFactors;
    #ifdef REFLECTANCE
        vec4 reflectanceFactorsMap = texture2D(reflectanceSampler, vReflectanceUV + uvOffset);
        #ifdef REFLECTANCE_GAMMA
            reflectanceFactorsMap = toLinearSpace(reflectanceFactorsMap);
        #endif

        metallicReflectanceFactors.rgb *= reflectanceFactorsMap.rgb;
    #endif
    #ifdef METALLIC_REFLECTANCE
        vec4 metallicReflectanceFactorsMap = texture2D(metallicReflectanceSampler, vMetallicReflectanceUV + uvOffset);
        #ifdef METALLIC_REFLECTANCE_GAMMA
            metallicReflectanceFactorsMap = toLinearSpace(metallicReflectanceFactorsMap);
        #endif

        #ifndef METALLIC_REFLECTANCE_USE_ALPHA_ONLY
            metallicReflectanceFactors.rgb *= metallicReflectanceFactorsMap.rgb;
        #endif
        metallicReflectanceFactors.a *= metallicReflectanceFactorsMap.a;
    #endif
#endif

#ifdef BASE_DIFFUSE_ROUGHNESS
    float baseDiffuseRoughnessTexture = texture2D(baseDiffuseRoughnessSampler, vBaseDiffuseRoughnessUV + uvOffset).r;
#endif

    reflectivityOut = reflectivityBlock(
        vReflectivityColor
    #ifdef METALLICWORKFLOW
        , surfaceAlbedo
        , metallicReflectanceFactors
    #endif
        , baseDiffuseRoughness
    #ifdef BASE_DIFFUSE_ROUGHNESS
        , baseDiffuseRoughnessTexture
        , vBaseDiffuseRoughnessInfos
    #endif
    #ifdef REFLECTIVITY
        , vReflectivityInfos
        , surfaceMetallicOrReflectivityColorMap
    #endif
    #if defined(METALLICWORKFLOW) && defined(REFLECTIVITY)  && defined(AOSTOREINMETALMAPRED)
        , aoOut.ambientOcclusionColor
    #endif
    #ifdef MICROSURFACEMAP
        , microSurfaceTexel
    #endif
    #ifdef DETAIL
        , detailColor
        , vDetailInfos
    #endif
    );

    float microSurface = reflectivityOut.microSurface;
    float roughness = reflectivityOut.roughness;
    float diffuseRoughness = reflectivityOut.diffuseRoughness;

    #ifdef METALLICWORKFLOW
        surfaceAlbedo = reflectivityOut.surfaceAlbedo;
    #endif
    #if defined(METALLICWORKFLOW) && defined(REFLECTIVITY) && defined(AOSTOREINMETALMAPRED)
        aoOut.ambientOcclusionColor = reflectivityOut.ambientOcclusionColor;
    #endif

    // _____________________________ Alpha Fresnel ___________________________________
    #ifdef ALPHAFRESNEL
        #if defined(ALPHATEST) || defined(ALPHABLEND)
            alphaFresnelOutParams alphaFresnelOut;

            alphaFresnelOut = alphaFresnelBlock(
                normalW,
                viewDirectionW,
                alpha,
                microSurface
            );

            alpha = alphaFresnelOut.alpha;
        #endif
    #endif

    // _____________________________ Compute Geometry info _________________________________
    #include<pbrBlockGeometryInfo>

    // _____________________________ Anisotropy _______________________________________
    #ifdef ANISOTROPIC
        anisotropicOutParams anisotropicOut;

        #ifdef ANISOTROPIC_TEXTURE
            vec3 anisotropyMapData = texture2D(anisotropySampler, vAnisotropyUV + uvOffset).rgb * vAnisotropyInfos.y;
        #endif

        anisotropicOut = anisotropicBlock(
            vAnisotropy,
            roughness,
        #ifdef ANISOTROPIC_TEXTURE
            anisotropyMapData,
        #endif
            TBN,
            normalW,
            viewDirectionW
        );
    #endif

    // _____________________________ Reflection Info _______________________________________
    #ifdef REFLECTION
        reflectionOutParams reflectionOut;

        #ifndef USE_CUSTOM_REFLECTION
            reflectionOut = reflectionBlock(
                vPositionW
                , normalW
                , alphaG
                , vReflectionMicrosurfaceInfos
                , vReflectionInfos
                , vReflectionColor
            #ifdef ANISOTROPIC
                , anisotropicOut
            #endif
            #if defined(LODINREFLECTIONALPHA) && !defined(REFLECTIONMAP_SKYBOX)
                , NdotVUnclamped
            #endif
            #ifdef LINEARSPECULARREFLECTION
                , roughness
            #endif
                , reflectionSampler
            #if defined(NORMAL) && defined(USESPHERICALINVERTEX)
                , vEnvironmentIrradiance
            #endif
            #if (defined(USESPHERICALFROMREFLECTIONMAP) && (!defined(NORMAL) || !defined(USESPHERICALINVERTEX))) || (defined(USEIRRADIANCEMAP) && defined(REFLECTIONMAP_3D))
                , reflectionMatrix
            #endif
            #ifdef USEIRRADIANCEMAP
                , irradianceSampler
                #ifdef USE_IRRADIANCE_DOMINANT_DIRECTION
                    , vReflectionDominantDirection
                #endif
            #endif
            #ifndef LODBASEDMICROSFURACE
                , reflectionSamplerLow
                , reflectionSamplerHigh
            #endif
            #ifdef REALTIME_FILTERING
                , vReflectionFilteringInfo
                #ifdef IBL_CDF_FILTERING
                    , icdfSampler
                #endif
            #endif
                , viewDirectionW
                , diffuseRoughness
                , baseColor
            );
        #else
            #define CUSTOM_REFLECTION
        #endif
    #endif

    // ___________________ Compute Reflectance aka R0 F0 info _________________________
    #include<pbrBlockReflectance0>

    // ________________________________ Sheen ______________________________
    #ifdef SHEEN
        sheenOutParams sheenOut;

        #ifdef SHEEN_TEXTURE
            vec4 sheenMapData = texture2D(sheenSampler, vSheenUV + uvOffset);
        #endif
        #if defined(SHEEN_ROUGHNESS) && defined(SHEEN_TEXTURE_ROUGHNESS) && !defined(SHEEN_USE_ROUGHNESS_FROM_MAINTEXTURE)
            vec4 sheenMapRoughnessData = texture2D(sheenRoughnessSampler, vSheenRoughnessUV + uvOffset) * vSheenInfos.w;
        #endif

        sheenOut = sheenBlock(
            vSheenColor
        #ifdef SHEEN_ROUGHNESS
            , vSheenRoughness
            #if defined(SHEEN_TEXTURE_ROUGHNESS) && !defined(SHEEN_USE_ROUGHNESS_FROM_MAINTEXTURE)
                , sheenMapRoughnessData
            #endif
        #endif
            , roughness
        #ifdef SHEEN_TEXTURE
            , sheenMapData
            , vSheenInfos.y
        #endif
            , reflectanceF0
        #ifdef SHEEN_LINKWITHALBEDO
            , baseColor
            , surfaceAlbedo
        #endif
        #ifdef ENVIRONMENTBRDF
            , NdotV
            , environmentBrdf
        #endif
        #if defined(REFLECTION) && defined(ENVIRONMENTBRDF)
            , AARoughnessFactors
            , vReflectionMicrosurfaceInfos
            , vReflectionInfos
            , vReflectionColor
            , vLightingIntensity
            , reflectionSampler
            , reflectionOut.reflectionCoords
            , NdotVUnclamped
            #ifndef LODBASEDMICROSFURACE
                , reflectionSamplerLow
                , reflectionSamplerHigh
            #endif
            #ifdef REALTIME_FILTERING
                , vReflectionFilteringInfo
            #endif
            #if !defined(REFLECTIONMAP_SKYBOX) && defined(RADIANCEOCCLUSION)
                , seo
            #endif
            #if !defined(REFLECTIONMAP_SKYBOX) && defined(HORIZONOCCLUSION) && defined(BUMP) && defined(REFLECTIONMAP_3D)
                , eho
            #endif
        #endif
        );

        #ifdef SHEEN_LINKWITHALBEDO
            surfaceAlbedo = sheenOut.surfaceAlbedo;
        #endif
    #endif

    // _____________ Shared Iridescence and Clear Coat data _________________
    #ifdef CLEARCOAT
        #ifdef CLEARCOAT_TEXTURE
            vec2 clearCoatMapData = texture2D(clearCoatSampler, vClearCoatUV + uvOffset).rg * vClearCoatInfos.y;
        #endif
    #endif

    // _____________________________ Iridescence ____________________________
    #ifdef IRIDESCENCE
        iridescenceOutParams iridescenceOut;

        #ifdef IRIDESCENCE_TEXTURE
            vec2 iridescenceMapData = texture2D(iridescenceSampler, vIridescenceUV + uvOffset).rg * vIridescenceInfos.y;
        #endif
        #ifdef IRIDESCENCE_THICKNESS_TEXTURE
            vec2 iridescenceThicknessMapData = texture2D(iridescenceThicknessSampler, vIridescenceThicknessUV + uvOffset).rg * vIridescenceInfos.w;
        #endif

        iridescenceOut = iridescenceBlock(
            vIridescenceParams
            , NdotV
            , specularEnvironmentR0
            #ifdef IRIDESCENCE_TEXTURE
                , iridescenceMapData
            #endif
            #ifdef IRIDESCENCE_THICKNESS_TEXTURE
                , iridescenceThicknessMapData
            #endif
            #ifdef CLEARCOAT
                , NdotVUnclamped
                , vClearCoatParams
                #ifdef CLEARCOAT_TEXTURE
                    , clearCoatMapData
                #endif
            #endif
        );

        float iridescenceIntensity = iridescenceOut.iridescenceIntensity;
        specularEnvironmentR0 = iridescenceOut.specularEnvironmentR0;
    #endif

    // _____________________________ Clear Coat ____________________________
    clearcoatOutParams clearcoatOut;

    #ifdef CLEARCOAT
        #if defined(CLEARCOAT_TEXTURE_ROUGHNESS) && !defined(CLEARCOAT_USE_ROUGHNESS_FROM_MAINTEXTURE)
            vec4 clearCoatMapRoughnessData = texture2D(clearCoatRoughnessSampler, vClearCoatRoughnessUV + uvOffset) * vClearCoatInfos.w;
        #endif

        #if defined(CLEARCOAT_TINT) && defined(CLEARCOAT_TINT_TEXTURE)
            vec4 clearCoatTintMapData = texture2D(clearCoatTintSampler, vClearCoatTintUV + uvOffset);
        #endif

        #ifdef CLEARCOAT_BUMP
            vec4 clearCoatBumpMapData = texture2D(clearCoatBumpSampler, vClearCoatBumpUV + uvOffset);
        #endif

        clearcoatOut = clearcoatBlock(
            vPositionW
            , geometricNormalW
            , viewDirectionW
            , vClearCoatParams
            #if defined(CLEARCOAT_TEXTURE_ROUGHNESS) && !defined(CLEARCOAT_USE_ROUGHNESS_FROM_MAINTEXTURE)
                , clearCoatMapRoughnessData
            #endif
            , specularEnvironmentR0
        #ifdef CLEARCOAT_TEXTURE
            , clearCoatMapData
        #endif
        #ifdef CLEARCOAT_TINT
            , vClearCoatTintParams
            , clearCoatColorAtDistance
            , vClearCoatRefractionParams
            #ifdef CLEARCOAT_TINT_TEXTURE
                , clearCoatTintMapData
            #endif
        #endif
        #ifdef CLEARCOAT_BUMP
            , vClearCoatBumpInfos
            , clearCoatBumpMapData
            , vClearCoatBumpUV
            #if defined(TANGENT) && defined(NORMAL)
                , vTBN
            #else
                , vClearCoatTangentSpaceParams
            #endif
            #ifdef OBJECTSPACE_NORMALMAP
                , normalMatrix
            #endif
        #endif
        #if defined(FORCENORMALFORWARD) && defined(NORMAL)
            , faceNormal
        #endif
        #ifdef REFLECTION
            , vReflectionMicrosurfaceInfos
            , vReflectionInfos
            , vReflectionColor
            , vLightingIntensity
            , reflectionSampler
            #ifndef LODBASEDMICROSFURACE
                , reflectionSamplerLow
                , reflectionSamplerHigh
            #endif
            #ifdef REALTIME_FILTERING
                , vReflectionFilteringInfo
            #endif
        #endif
        #if defined(CLEARCOAT_BUMP) || defined(TWOSIDEDLIGHTING)
            , (gl_FrontFacing ? 1. : -1.)
        #endif
        );
    #else
        clearcoatOut.specularEnvironmentR0 = specularEnvironmentR0;
    #endif

    // _________________________ Specular Environment Reflectance __________________________
    #include<pbrBlockReflectance>

    // ___________________________________ SubSurface ______________________________________
    subSurfaceOutParams subSurfaceOut;

    #ifdef SUBSURFACE
        #ifdef SS_THICKNESSANDMASK_TEXTURE
            vec4 thicknessMap = texture2D(thicknessSampler, vThicknessUV + uvOffset);
        #endif

        #ifdef SS_REFRACTIONINTENSITY_TEXTURE
            vec4 refractionIntensityMap = texture2D(refractionIntensitySampler, vRefractionIntensityUV + uvOffset);
        #endif

        #ifdef SS_TRANSLUCENCYINTENSITY_TEXTURE
            vec4 translucencyIntensityMap = texture2D(translucencyIntensitySampler, vTranslucencyIntensityUV + uvOffset);
        #endif

        #ifdef SS_TRANSLUCENCYCOLOR_TEXTURE
            vec4 translucencyColorMap = texture2D(translucencyColorSampler, vTranslucencyColorUV + uvOffset);
            #ifdef SS_TRANSLUCENCYCOLOR_TEXTURE_GAMMA
                translucencyColorMap = toLinearSpace(translucencyColorMap);
            #endif
        #endif

        #ifdef LEGACY_SPECULAR_ENERGY_CONSERVATION
            vec3 vSpecularEnvironmentReflectance = vec3(max(colorSpecularEnvironmentReflectance.r, max(colorSpecularEnvironmentReflectance.g, colorSpecularEnvironmentReflectance.b)));
        #endif

        subSurfaceOut = subSurfaceBlock(
            vSubSurfaceIntensity
            , vThicknessParam
            , vTintColor
            , normalW
        #ifdef LEGACY_SPECULAR_ENERGY_CONSERVATION
            , vSpecularEnvironmentReflectance
        #else
            , baseSpecularEnvironmentReflectance
        #endif
        #ifdef SS_THICKNESSANDMASK_TEXTURE
            , thicknessMap
        #endif
        #ifdef SS_REFRACTIONINTENSITY_TEXTURE
            , refractionIntensityMap
        #endif
        #ifdef SS_TRANSLUCENCYINTENSITY_TEXTURE
            , translucencyIntensityMap
        #endif
        #ifdef REFLECTION
            #ifdef SS_TRANSLUCENCY
                , reflectionMatrix
                #ifdef USESPHERICALFROMREFLECTIONMAP
                    #if !defined(NORMAL) || !defined(USESPHERICALINVERTEX)
                        , reflectionOut.irradianceVector
                    #endif
                    #if defined(REALTIME_FILTERING)
                        , reflectionSampler
                        , vReflectionFilteringInfo
                        #ifdef IBL_CDF_FILTERING
                            , icdfSampler
                        #endif
                    #endif
                #endif
                #ifdef USEIRRADIANCEMAP
                    , irradianceSampler
                #endif
            #endif
        #endif
        #if defined(SS_REFRACTION) || defined(SS_TRANSLUCENCY)
            , surfaceAlbedo
        #endif
        #ifdef SS_REFRACTION
            , vPositionW
            , viewDirectionW
            , view
            , vRefractionInfos
            , refractionMatrix
            , vRefractionMicrosurfaceInfos
            , vLightingIntensity
            #ifdef SS_LINKREFRACTIONTOTRANSPARENCY
                , alpha
            #endif
            #ifdef SS_LODINREFRACTIONALPHA
                , NdotVUnclamped
            #endif
            #ifdef SS_LINEARSPECULARREFRACTION
                , roughness
            #endif
            , alphaG
            , refractionSampler
            #ifndef LODBASEDMICROSFURACE
                , refractionSamplerLow
                , refractionSamplerHigh
            #endif
            #ifdef ANISOTROPIC
                , anisotropicOut
            #endif
            #ifdef REALTIME_FILTERING
                , vRefractionFilteringInfo
            #endif
            #ifdef SS_USE_LOCAL_REFRACTIONMAP_CUBIC
                , vRefractionPosition
                , vRefractionSize
            #endif
            #ifdef SS_DISPERSION
                , dispersion
            #endif
        #endif
        #ifdef SS_TRANSLUCENCY
            , vDiffusionDistance
            , vTranslucencyColor
            #ifdef SS_TRANSLUCENCYCOLOR_TEXTURE
                , translucencyColorMap
            #endif
        #endif
        );

        #ifdef SS_REFRACTION
            surfaceAlbedo = subSurfaceOut.surfaceAlbedo;
            #ifdef SS_LINKREFRACTIONTOTRANSPARENCY
                alpha = subSurfaceOut.alpha;
            #endif
        #endif
    #else
        subSurfaceOut.specularEnvironmentReflectance = colorSpecularEnvironmentReflectance;
    #endif

    // _____________________________ Direct Lighting Info __________________________________
    #include<pbrBlockDirectLighting>

    #include<lightFragment>[0..maxSimultaneousLights]

    // _____________________________ Compute Final Lit Components ________________________
    #include<pbrBlockFinalLitComponents>
#endif // !UNLIT

    #include<pbrBlockFinalUnlitComponents>

    #define CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION

    #include<pbrBlockFinalColorComposition>

    #include<logDepthFragment>
    #include<fogFragment>(color, finalColor)
    #include<pbrBlockImageProcessing>

    #define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR

#ifdef PREPASS
    #include<pbrBlockPrePass>
#endif

#if !defined(PREPASS) || defined(WEBGL2)
    gl_FragColor = finalColor;
#endif

    #include<oitFragment>

#if ORDER_INDEPENDENT_TRANSPARENCY
	if (fragDepth == nearestDepth) {
		frontColor.rgb += finalColor.rgb * finalColor.a * alphaMultiplier;
        // Cancels the 1 - a initial value operation
		frontColor.a = 1.0 - alphaMultiplier * (1.0 - finalColor.a);
	} else {
		backColor += finalColor;
	}
#endif

    #include<pbrDebug>

    #define CUSTOM_FRAGMENT_MAIN_END

}
