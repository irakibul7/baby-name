import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

const inviteCodeFromPath = window.location.pathname.match(/^\/join\/([a-z0-9]{4,12})\/?$/i)?.[1];
export const familyCode = (inviteCodeFromPath || import.meta.env.VITE_FAMILY_CODE || "8H2K").trim().toUpperCase();
export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

function requireSupabase() {
  if (!supabase) throw new Error("Supabase environment variables are not configured.");
  return supabase;
}

export async function ensureAnonymousUser(displayName) {
  const client = requireSupabase();
  const cleanDisplayName = displayName.trim();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session?.user) {
    const currentUser = sessionData.session.user;
    if (currentUser.user_metadata?.display_name === cleanDisplayName) return currentUser;

    const { data, error } = await client.auth.updateUser({ data: { display_name: cleanDisplayName } });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await client.auth.signInAnonymously({
    options: { data: { display_name: cleanDisplayName } },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Supabase did not return an anonymous user.");
  return data.user;
}

export async function joinFamily(code = familyCode, displayName) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("join_family", {
    p_family_code: code,
    p_display_name: displayName.trim(),
  });
  if (error) throw error;
  return data;
}

export async function fetchFamilyPolls(userId, code = familyCode) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("polls")
    .select(`
      id,
      type,
      question,
      creator_name,
      created_at,
      poll_options (
        id,
        name,
        native_script,
        sort_order,
        poll_votes ( voter_id )
      )
    `)
    .eq("family_code", code)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((poll) => {
    const options = [...(poll.poll_options || [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((option) => ({
        id: option.id,
        name: option.name,
        native: option.native_script || "",
        votes: option.poll_votes?.length || 0,
      }));
    const votedOption = (poll.poll_options || []).find((option) => option.poll_votes?.some((vote) => vote.voter_id === userId));

    return {
      id: poll.id,
      type: poll.type,
      question: poll.question,
      createdBy: poll.creator_name,
      createdAt: poll.created_at,
      votedOptionId: votedOption?.id || null,
      options,
    };
  });
}

export async function createFamilyPoll({ code = familyCode, type, question, names }) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("create_family_poll", {
    p_family_code: code,
    p_type: type,
    p_question: question,
    p_names: names,
  });
  if (error) throw error;
  return data;
}

export async function castFamilyPollVote(pollId, optionId) {
  const client = requireSupabase();
  const { error } = await client.rpc("cast_poll_vote", {
    p_poll_id: pollId,
    p_option_id: optionId,
  });
  if (error) throw error;
}

export function subscribeToFamilyPolls(code, onChange) {
  const client = requireSupabase();
  const channel = client
    .channel(`family-polls-${code}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "polls", filter: `family_code=eq.${code}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "poll_options" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, onChange)
    .subscribe();

  return () => { void client.removeChannel(channel); };
}
