update public.social_platform_capabilities
set engagement_metrics_supported = true,
    comment_read_supported = true,
    comment_reply_supported = true,
    required_engagement_scopes = array['tweet.read','users.read']::text[],
    required_comment_scopes = array['tweet.read','users.read','tweet.write']::text[],
    api_notes = jsonb_build_object(
      'community_mode','mentions_and_reply_verified',
      'verification','X professional verification requires authenticated account identity, readable authored-post metrics, readable mentions, and tweet.write for replies.',
      'reply_policy','Actual autonomous replies remain subject to ALLSHIELD low-risk community rules and X reply eligibility/API access.'
    ),
    updated_at = now()
where platform = 'x';
