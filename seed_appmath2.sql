-- ============================================================
-- Seed: Applied Mathematics-II question bank (6 units)
-- Run in Supabase SQL editor of project dfkpsipqdkbrknxmtzmh.
-- Prerequisites: schema (subjects, questions) already created.
-- Idempotent: re-running skips questions whose text already exists
-- for this subject. co_no is set = unit_no (CO1..CO6).
-- ============================================================
begin;

with subj as (
  insert into public.subjects (code, name, semester)
  values ('CS/AI/ML201BSC03', 'Applied Mathematics-II', 2)
  on conflict (code) do update
    set name = excluded.name, semester = excluded.semester
  returning id
)
insert into public.questions
  (subject_id, unit_no, marks, difficulty, bt_level, co_no, text, is_active)
select s.id, v.unit_no, v.marks, v.difficulty, v.bt_level, v.unit_no, v.text, true
from subj s
cross join (values
  -- ================= UNIT 1 : Logic, Sets, Monoids, Groups =================
  (1, 1, 'easy',   1, 'Define Tautology.'),
  (1, 1, 'easy',   2, 'Define Contradiction.'),
  (1, 1, 'easy',   1, 'Define Predicate.'),
  (1, 1, 'easy',   2, 'Define Universal Quantifier.'),
  (1, 1, 'easy',   1, 'Define Existential Quantifier.'),
  (1, 1, 'easy',   2, 'Define Monoid.'),
  (1, 1, 'easy',   1, 'Define Group.'),
  (1, 1, 'easy',   2, 'What is Identity element?'),
  (1, 1, 'easy',   1, 'Define Partial Order.'),
  (1, 1, 'easy',   2, 'Define Lattice.'),
  (1, 4, 'medium', 3, 'Construct the truth table and determine whether [(P→Q)∧(R→P)]→(R→Q) is a tautology, contradiction, or contingency.'),
  (1, 4, 'medium', 3, 'Given A={1,2,3,4} and R={(1,1),(2,2),(3,3),(4,4),(1,2),(2,3),(1,3)}, determine whether R is reflexive, symmetric, antisymmetric and transitive. Hence determine whether it is a partial order.'),
  (1, 4, 'medium', 3, 'Let A={1,2,3,6,12} under divisibility. Draw the Hasse diagram and determine greatest, least, maximal and minimal elements.'),
  (1, 4, 'medium', 3, 'Let f(x)=3x−5 from R→R. Determine whether it is one-one, onto and bijective.'),
  (1, 4, 'medium', 3, 'Show whether (Z10,+) forms a group. Identify identity and inverses.'),
  (1, 4, 'medium', 3, 'Verify using Venn diagram: A−(B∪C)=(A−B)∩(A−C).'),
  (1, 4, 'medium', 3, 'Determine whether aRb iff a−b is divisible by 5 is an equivalence relation.'),
  (1, 4, 'medium', 3, 'Construct truth table for [(P∨Q)→R]↔[(P→R)∧(Q→R)].'),
  (1, 4, 'medium', 3, 'Determine all upper bounds, lower bounds, LUB and GLB for {2,4} under divisibility.'),
  (1, 4, 'medium', 3, 'Show whether (N,×) is a monoid but not a group.'),

  -- ================= UNIT 2 : Graph Theory & Combinatorics =================
  (2, 1, 'easy',   1, 'Define Complete Graph.'),
  (2, 1, 'easy',   2, 'Define Simple Graph.'),
  (2, 1, 'easy',   1, 'Define Tree.'),
  (2, 1, 'easy',   2, 'Define Matching.'),
  (2, 1, 'easy',   1, 'Define Bipartite Graph.'),
  (2, 1, 'easy',   2, 'Define Chromatic Number.'),
  (2, 1, 'easy',   1, 'Define Connected Graph.'),
  (2, 1, 'easy',   2, 'Define Recurrence Relation.'),
  (2, 1, 'easy',   1, 'Define Generating Function.'),
  (2, 1, 'easy',   2, 'Define Euler Graph.'),
  (2, 4, 'medium', 3, 'Solve a(n)=3a(n-1)−2, a(0)=4. Find first six terms.'),
  (2, 4, 'medium', 3, 'Solve a(n)=2a(n-1)+n, a(0)=1.'),
  (2, 4, 'medium', 3, 'Find the coefficient of x^5 in (2+3x)^8.'),
  (2, 4, 'medium', 3, 'Find the generating function of 1,3,6,10,15,…'),
  (2, 4, 'medium', 3, 'Find the recurrence relation satisfied by 1,4,9,16,25,…'),
  (2, 4, 'medium', 3, 'A graph has 10 vertices and 15 edges. Determine whether it is connected and whether it can be a tree.'),
  (2, 4, 'medium', 3, 'Determine the chromatic number of a given graph.'),
  (2, 4, 'medium', 3, 'Determine whether a graph possesses an Euler path, Euler circuit and Hamiltonian cycle.'),
  (2, 4, 'medium', 3, 'Find the number of spanning trees of the given graph.'),
  (2, 4, 'medium', 3, 'Find the degree sequence and verify the Handshaking Lemma.'),

  -- ================= UNIT 3 : Statistics =================
  (3, 1, 'easy',   1, 'Define Mean.'),
  (3, 1, 'easy',   2, 'Define Median.'),
  (3, 1, 'easy',   1, 'Define Mode.'),
  (3, 1, 'easy',   2, 'Define Standard Deviation.'),
  (3, 1, 'easy',   1, 'Define Variance.'),
  (3, 1, 'easy',   2, 'Define Correlation.'),
  (3, 1, 'easy',   1, 'Define Covariance.'),
  (3, 1, 'easy',   2, 'Define Frequency Distribution.'),
  (3, 1, 'easy',   1, 'Define Class Interval.'),
  (3, 1, 'easy',   2, 'Define Arithmetic Mean.'),
  (3, 4, 'medium', 3, 'Calculate the arithmetic mean (Direct Method) of the grouped frequency distribution: Class Interval 10-20, 20-30, 30-40, 40-50, 50-60, 60-70; Frequency 5, 8, 15, 12, 7, 3.'),
  (3, 4, 'medium', 3, 'Calculate the arithmetic mean using the Assumed Mean Method: Class Interval 0-10, 10-20, 20-30, 30-40, 40-50; Frequency 6, 9, 18, 10, 7.'),
  (3, 4, 'medium', 3, 'Find the median of the grouped data: Class Interval 0-20, 20-40, 40-60, 60-80, 80-100; Frequency 5, 9, 14, 11, 6.'),
  (3, 4, 'medium', 3, 'Calculate the mode of the grouped frequency distribution: Class Interval 5-15, 15-25, 25-35, 35-45, 45-55; Frequency 4, 8, 15, 12, 6.'),
  (3, 4, 'medium', 3, 'Calculate the standard deviation using the Direct Method: Class Interval 20-30, 30-40, 40-50, 50-60, 60-70; Frequency 4, 7, 12, 10, 7.'),
  (3, 4, 'medium', 3, 'For the discrete frequency distribution, calculate (i) Arithmetic Mean and (ii) Standard Deviation: Marks 15, 25, 35, 45, 55, 65; Frequency 5, 7, 10, 8, 6, 4.'),
  (3, 4, 'medium', 3, 'Calculate the covariance between X and Y: X 2, 4, 6, 8, 10; Y 5, 9, 11, 15, 18.'),
  (3, 4, 'medium', 3, 'Find Karl Pearson''s coefficient of correlation for the paired observations: X 12, 18, 20, 25, 28, 30; Y 15, 20, 25, 30, 35, 38.'),
  (3, 4, 'medium', 3, 'The arithmetic mean of the following distribution is 30. Find the missing frequency x: Class Interval 10-20, 20-30, 30-40, 40-50; Frequency 6, x, 8, 5.'),
  (3, 4, 'hard',   4, 'The marks obtained by 50 students are: Class Interval 0-10, 10-20, 20-30, 30-40, 40-50, 50-60; Frequency 3, 7, 15, 12, 8, 5. Calculate (1) Arithmetic Mean, (2) Median, (3) Mode.'),

  -- ================= UNIT 4 : Hypothesis Testing =================
  (4, 1, 'easy',   1, 'Define Null Hypothesis.'),
  (4, 1, 'easy',   2, 'Define Alternative Hypothesis.'),
  (4, 1, 'easy',   1, 'Define Level of Significance.'),
  (4, 1, 'easy',   2, 'Define t-distribution.'),
  (4, 1, 'easy',   1, 'Define Chi-square distribution.'),
  (4, 1, 'easy',   2, 'Define Confidence Interval.'),
  (4, 1, 'easy',   1, 'When is z-test used?'),
  (4, 1, 'easy',   2, 'When is t-test used?'),
  (4, 1, 'easy',   1, 'Define Type-I Error.'),
  (4, 1, 'easy',   2, 'Define Type-II Error.'),
  (4, 4, 'medium', 3, 'Perform one-sample z-test (n=36, mean=53, σ=6, H0: μ=50).'),
  (4, 4, 'medium', 3, 'Perform one-sample t-test (n=16, mean=42, SD=5, H0: μ=40).'),
  (4, 4, 'medium', 3, 'Construct a 99% confidence interval.'),
  (4, 4, 'medium', 3, 'Perform Chi-square goodness-of-fit test.'),
  (4, 4, 'medium', 3, 'Perform Chi-square test for independence.'),
  (4, 4, 'medium', 3, 'Compare z-test and t-test numerically.'),
  (4, 4, 'medium', 3, 'Perform a left-tailed hypothesis test.'),
  (4, 4, 'medium', 3, 'Perform a right-tailed hypothesis test.'),
  (4, 4, 'medium', 3, 'Determine acceptance and rejection regions.'),
  (4, 4, 'medium', 3, 'Interpret the conclusion of a hypothesis test.'),

  -- ================= UNIT 5 : Probability Distributions =================
  (5, 1, 'easy',   1, 'Define Random Variable.'),
  (5, 1, 'easy',   2, 'Define Binomial Distribution.'),
  (5, 1, 'easy',   1, 'Define Poisson Distribution.'),
  (5, 1, 'easy',   2, 'Define Normal Distribution.'),
  (5, 1, 'easy',   1, 'Define Uniform Distribution.'),
  (5, 1, 'easy',   2, 'Define Exponential Distribution.'),
  (5, 1, 'easy',   1, 'Define Conditional Expectation.'),
  (5, 1, 'easy',   2, 'Define Conditional Variance.'),
  (5, 1, 'easy',   1, 'State the mean of the Binomial distribution.'),
  (5, 1, 'easy',   2, 'State the variance of the Poisson distribution.'),
  (5, 4, 'medium', 3, 'Binomial: 8% defective among 20 bulbs. Find exactly 3 and at most 4 defectives.'),
  (5, 4, 'medium', 3, 'Poisson: Average accidents=4/day. Find exactly 6 and at least 3 accidents.'),
  (5, 4, 'medium', 3, 'Normal: N(120,15²). Find probabilities above 135, below 90 and between 110 and 130.'),
  (5, 4, 'medium', 3, 'A die is thrown 12 times. Find probability of at least two sixes.'),
  (5, 4, 'medium', 3, 'A coin is tossed 10 times. Find probabilities of at least 7 heads and at most 3 heads.'),
  (5, 4, 'medium', 3, 'Uniform distribution: Find mean, variance and probability.'),
  (5, 4, 'medium', 3, 'Exponential distribution: Find reliability after 10 hours and failure probability before 8 hours.'),
  (5, 4, 'medium', 3, 'Find conditional expectation from joint probabilities.'),
  (5, 4, 'medium', 3, 'Find conditional variance.'),
  (5, 4, 'medium', 3, 'Determine whether Poisson approximation to Binomial is appropriate.'),

  -- ================= UNIT 6 : PMF, PDF, CDF, CLT =================
  (6, 1, 'easy',   1, 'Define PMF.'),
  (6, 1, 'easy',   2, 'Define PDF.'),
  (6, 1, 'easy',   1, 'Define CDF.'),
  (6, 1, 'easy',   2, 'Define Bernoulli Distribution.'),
  (6, 1, 'easy',   1, 'Define Continuous Random Variable.'),
  (6, 1, 'easy',   2, 'State one condition of a PMF.'),
  (6, 1, 'easy',   1, 'State one condition of a PDF.'),
  (6, 1, 'easy',   2, 'Define Standard Normal Distribution.'),
  (6, 1, 'easy',   1, 'State the Central Limit Theorem (CLT).'),
  (6, 1, 'easy',   2, 'Define Conditional PDF.'),
  (6, 4, 'medium', 3, 'Given f(x)=kx², 0<x<2. Find k, CDF and P(1<X<1.5).'),
  (6, 4, 'medium', 3, 'Given exponential PDF f(x)=1/20 e^(−x/20). Find P(X>30) and P(10<X<25).'),
  (6, 4, 'medium', 3, 'Given PMF P(X=x)=k(x+1), x=0,1,2,3. Find k, mean and variance.'),
  (6, 4, 'medium', 3, 'Construct Bernoulli PMF and derive mean and variance.'),
  (6, 4, 'medium', 3, 'Find sampling distribution mean and standard error (μ=75, σ=24, n=64).'),
  (6, 4, 'medium', 3, 'Using CLT, μ=100, σ=20, n=49. Find P(95<X̄<105).'),
  (6, 4, 'medium', 3, 'Verify whether a given function is a valid PDF.'),
  (6, 4, 'medium', 3, 'Find CDF from a given PDF and calculate probabilities.'),
  (6, 4, 'medium', 3, 'Solve probability using standard normal distribution.'),
  (6, 4, 'medium', 3, 'Bernoulli distribution with p=0.3: Find PMF, CDF, mean, variance and P(X≤1).')
) as v(unit_no, marks, difficulty, bt_level, text)
where not exists (
  select 1 from public.questions q
  where q.subject_id = s.id and q.text = v.text
);

commit;

-- quick check
select unit_no, marks, count(*)
from public.questions
where subject_id = (select id from public.subjects where code = 'CS/AI/ML201BSC03')
group by unit_no, marks
order by unit_no, marks;
